/**
 * @fileoverview src/features/tickets/services/ticketService.ts
 * Core ticket management service with business logic and email notifications
 */

import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";
import { sendTicketCreatedEmail, sendStatusChangedEmail, sendReopenedEmail } from "@/features/tickets/email";
import { shouldSendNotification } from "@/lib/email/notify";
import { logger } from "@/lib/logger";
import {
    REOPEN_WINDOW_DAYS,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
} from "@/features/tickets/constants";
import type { $Enums } from "../../../../generated/prisma";

// Security: User-specific storage key prefix for attachment isolation
const KEY_PREFIX = (userId: string) => `u/${userId}/`;
type UserCtx = { id: string; role: $Enums.Role; email: string; username: string };

// Business logic: Valid ticket status transitions (PRD requirement)
const ALLOWED: Record<$Enums.TicketStatus, $Enums.TicketStatus[]> = {
    new: ["in_progress", "closed"],
    in_progress: ["waiting_on_user", "resolved", "closed"],
    waiting_on_user: ["in_progress", "resolved", "closed"],
    resolved: ["closed", "reopened"],
    reopened: ["in_progress", "waiting_on_user", "resolved", "closed"],
    closed: [], // terminal unless admin reopens via special flow
};

async function getTicketForAdmin(ticketId: string) {
    return prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            userId: true,
            user: { select: { email: true } },
            resolvedAt: true,
            closedAt: true,
        },
    });
}

export const ticketService = {
    async createTicket(opts: {
        user: { id: string; email: string; username: string };
        title: string;
        body: string;
        attachments: Array<{ name: string; key: string; size: number; contentType: string }>;
        ip?: string | null;
    }) {
        logger.ticketOperation("creation started", "new", opts.user.id, {
            title: opts.title,
            attachmentCount: opts.attachments?.length || 0,
            ip: opts.ip,
        });

        // Security: ensure all attachment keys belong to this user
        for (const a of opts.attachments ?? []) {
            if (!a.key.startsWith(KEY_PREFIX(opts.user.id))) {
                logger.error("Invalid attachment key detected", {
                    userId: opts.user.id,
                    attachmentKey: a.key,
                    expectedPrefix: KEY_PREFIX(opts.user.id),
                });
                throw new Error("Invalid attachment key");
            }
        }

        const ticket = await prisma.ticket.create({
            data: {
                title: opts.title,
                body: opts.body,
                userId: opts.user.id,
                // status: default 'new' (enum default in schema)
                // priority: default 'normal'
                attachments: {
                    create: (opts.attachments ?? []).map((a) => ({
                        filename: a.name,
                        key: a.key,
                        size: a.size,
                        contentType: a.contentType,
                        uploadedById: opts.user.id,
                    })),
                },
            },
            select: {
                id: true,
                title: true,
            },
        });

        await audit(opts.user.id, "ticket:create", "ticket", ticket.id, { title: ticket.title }, opts.ip ?? null);

        logger.ticketOperation("created successfully", ticket.id, opts.user.id, {
            title: ticket.title,
            attachmentCount: opts.attachments?.length || 0,
        });

        // Notify Admin (PRD: notify admin on ticket created)
        try {
            await sendTicketCreatedEmail({
                ticketId: ticket.id,
                title: ticket.title,
                userEmail: opts.user.email,
                userUsername: opts.user.username,
            });
            logger.emailOperation("ticket created notification sent", opts.user.email, {
                ticketId: ticket.id,
                title: ticket.title,
            });
        } catch (error) {
            logger.error("Failed to send ticket created email", {
                ticketId: ticket.id,
                userEmail: opts.user.email,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }

        return ticket;
    },

    async updatePriority(opts: {
        admin: UserCtx;
        ticketId: string;
        priority: $Enums.Priority;
        ip?: string | null;
    }) {
        if (opts.admin.role !== "admin") {
            logger.error("Unauthorized priority update attempt", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
                priority: opts.priority,
            });
            throw new Error("Forbidden");
        }
        
        const p = opts.priority;
        if (!TICKET_PRIORITIES.includes(p)) {
            logger.error("Invalid priority value", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
                priority: p,
                validPriorities: TICKET_PRIORITIES,
            });
            throw new Error("Invalid priority");
        }

        const ticket = await getTicketForAdmin(opts.ticketId);
        if (!ticket) {
            logger.error("Ticket not found for priority update", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
            });
            throw new Error("Not found");
        }

        if (ticket.priority === p) {
            logger.ticketOperation("priority update skipped - no change", opts.ticketId, opts.admin.id, {
                priority: p,
            });
            return { id: ticket.id, priority: p };
        }

        logger.ticketOperation("priority update started", opts.ticketId, opts.admin.id, {
            from: ticket.priority,
            to: p,
            ip: opts.ip,
        });

        const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data: { priority: p },
            select: { id: true, priority: true },
        });

        await audit(
            opts.admin.id,
            "ticket:priority_change",
            "ticket",
            ticket.id,
            { from: ticket.priority, to: p },
            opts.ip ?? null
        );

        logger.ticketOperation("priority updated successfully", opts.ticketId, opts.admin.id, {
            from: ticket.priority,
            to: p,
        });

        return updated;
    },

    async updateStatus(opts: {
        admin: UserCtx;
        ticketId: string;
        status: $Enums.TicketStatus;
        ip?: string | null;
    }) {
        if (opts.admin.role !== "admin") {
            logger.error("Unauthorized status update attempt", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
                status: opts.status,
            });
            throw new Error("Forbidden");
        }
        
        const next = opts.status;
        if (!TICKET_STATUSES.includes(next)) {
            logger.error("Invalid status value", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
                status: next,
                validStatuses: TICKET_STATUSES,
            });
            throw new Error("Invalid status");
        }

        const ticket = await getTicketForAdmin(opts.ticketId);
        if (!ticket) {
            logger.error("Ticket not found for status update", {
                adminId: opts.admin.id,
                ticketId: opts.ticketId,
            });
            throw new Error("Not found");
        }
        
        const prev = ticket.status as $Enums.TicketStatus;

        if (prev === next) {
            logger.ticketOperation("status update skipped - no change", opts.ticketId, opts.admin.id, {
                status: next,
            });
            return { id: ticket.id, status: next };
        }

        logger.ticketOperation("status update started", opts.ticketId, opts.admin.id, {
            from: prev,
            to: next,
            ip: opts.ip,
        });

        // transition guard - admins can bypass restrictions
        if (opts.admin.role !== "admin" && !ALLOWED[prev]?.includes(next)) {
            throw new Error(`Invalid transition: ${prev} → ${next}`);
        }

        // timestamp side-effects
        const data: Partial<{
            status: $Enums.TicketStatus;
            resolvedAt: Date | null;
            closedAt: Date | null;
        }> = { status: next };

        if (next === "resolved") {
            data.resolvedAt = new Date();
            data.closedAt = null;
        } else if (next === "closed") {
            data.closedAt = new Date();
        } else {
            // moving away from resolved/closed clears closedAt; keep resolvedAt unless reopening
            if (prev === "resolved" || prev === "closed") data.closedAt = null;
            if (next === "reopened") data.resolvedAt = null;
        }

        const updated = await prisma.ticket.update({
            where: { id: ticket.id },
            data,
            select: { id: true, status: true, title: true, user: { select: { email: true } } },
        });

        await audit(
            opts.admin.id,
            "ticket:status_change",
            "ticket",
            ticket.id,
            { from: prev, to: next },
            opts.ip ?? null
        );

        logger.ticketOperation("status updated successfully", opts.ticketId, opts.admin.id, {
            from: prev,
            to: next,
        });

        // notify requester
        if (await shouldSendNotification(ticket.id, "status_changed")) {
            try {
                await sendStatusChangedEmail({
                    ticketId: ticket.id,
                    title: updated.title,
                    newStatus: next,
                    recipientEmail: updated.user.email,
                });
                logger.emailOperation("status change notification sent", updated.user.email, {
                    ticketId: ticket.id,
                    from: prev,
                    to: next,
                });
            } catch (error) {
                logger.error("Failed to send status change email", {
                    ticketId: ticket.id,
                    recipientEmail: updated.user.email,
                    from: prev,
                    to: next,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        return { id: ticket.id, status: next };
    },

    async reopen(opts: { actor: UserCtx; ticketId: string; ip?: string | null }) {
        logger.ticketOperation("reopen started", opts.ticketId, opts.actor.id, {
            actorRole: opts.actor.role,
            ip: opts.ip,
        });

        const t = await prisma.ticket.findUnique({
            where: { id: opts.ticketId },
            select: {
                id: true,
                title: true,
                status: true,
                resolvedAt: true,
                userId: true,
            },
        });
        if (!t) {
            logger.error("Ticket not found for reopen", {
                actorId: opts.actor.id,
                ticketId: opts.ticketId,
            });
            throw new Error("Not found");
        }

        const isAdmin = opts.actor.role === "admin";
        const isOwner = t.userId === opts.actor.id;

        if (!isAdmin && !isOwner) {
            logger.error("Unauthorized reopen attempt", {
                actorId: opts.actor.id,
                ticketId: opts.ticketId,
                ticketOwnerId: t.userId,
                actorRole: opts.actor.role,
            });
            throw new Error("Forbidden");
        }

        // must be from RESOLVED (or CLOSED if admin wants to force)
        if (!isAdmin && t.status !== "resolved") {
            logger.error("Invalid ticket status for reopen", {
                actorId: opts.actor.id,
                ticketId: opts.ticketId,
                currentStatus: t.status,
                actorRole: opts.actor.role,
            });
            throw new Error("Only resolved tickets can be reopened by the requester");
        }

        // window check (users only)
        if (!isAdmin) {
            const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt) : null;
            if (!resolvedAt) {
                logger.error("No resolved date for reopen window check", {
                    actorId: opts.actor.id,
                    ticketId: opts.ticketId,
                });
                throw new Error("Reopen window elapsed");
            }
            const cutoff = new Date(
                resolvedAt.getTime() + REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000
            );
            if (new Date() > cutoff) {
                logger.error("Reopen window elapsed", {
                    actorId: opts.actor.id,
                    ticketId: opts.ticketId,
                    resolvedAt: resolvedAt.toISOString(),
                    cutoff: cutoff.toISOString(),
                    windowDays: REOPEN_WINDOW_DAYS,
                });
                throw new Error("Reopen window elapsed");
            }
        }

        const updated = await prisma.ticket.update({
            where: { id: t.id },
            data: { status: "reopened", resolvedAt: null, closedAt: null },
            select: { id: true, title: true },
        });

        await audit(
            opts.actor.id,
            "ticket:reopen",
            "ticket",
            t.id,
            {},
            opts.ip ?? null
        );

        logger.ticketOperation("reopened successfully", opts.ticketId, opts.actor.id, {
            from: t.status,
            to: "reopened",
            actorRole: opts.actor.role,
        });

        // notify Admin if requester reopened
        if (!isAdmin && (await shouldSendNotification(t.id, "reopened"))) {
            try {
                await sendReopenedEmail({
                    ticketId: t.id,
                    title: t.title,
                    adminEmail: process.env.ADMIN_EMAIL!,
                });
                logger.emailOperation("reopen notification sent", process.env.ADMIN_EMAIL!, {
                    ticketId: t.id,
                    title: t.title,
                });
            } catch (error) {
                logger.error("Failed to send reopen notification", {
                    ticketId: t.id,
                    adminEmail: process.env.ADMIN_EMAIL!,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        return { id: updated.id, status: "reopened" as $Enums.TicketStatus };
    },
};
