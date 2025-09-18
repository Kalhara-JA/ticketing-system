import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";
import { sendTicketCreatedEmail, sendStatusChangedEmail, sendReopenedEmail } from "@/features/tickets/email";
import { shouldSendNotification } from "@/lib/email/notify";
import {
    REOPEN_WINDOW_DAYS,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
} from "@/features/tickets/constants";
import type { $Enums } from "../../../../generated/prisma";

const KEY_PREFIX = (userId: string) => `u/${userId}/`;
type UserCtx = { id: string; role: $Enums.Role; email: string; username: string };

// Status constants removed as they were unused

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
        // Security: ensure all attachment keys belong to this user
        for (const a of opts.attachments ?? []) {
            if (!a.key.startsWith(KEY_PREFIX(opts.user.id))) {
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

        // Notify Admin (PRD: notify admin on ticket created)
        await sendTicketCreatedEmail({
            ticketId: ticket.id,
            title: ticket.title,
            userEmail: opts.user.email,
            userUsername: opts.user.username,
        });

        return ticket;
    },

    async updatePriority(opts: {
        admin: UserCtx;
        ticketId: string;
        priority: $Enums.Priority;
        ip?: string | null;
    }) {
        if (opts.admin.role !== "admin") throw new Error("Forbidden");
        const p = opts.priority;
        if (!TICKET_PRIORITIES.includes(p)) throw new Error("Invalid priority");

        const ticket = await getTicketForAdmin(opts.ticketId);
        if (!ticket) throw new Error("Not found");

        if (ticket.priority === p) return { id: ticket.id, priority: p };

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
        return updated;
    },

    async updateStatus(opts: {
        admin: UserCtx;
        ticketId: string;
        status: $Enums.TicketStatus;
        ip?: string | null;
    }) {
        if (opts.admin.role !== "admin") throw new Error("Forbidden");
        const next = opts.status;
        if (!TICKET_STATUSES.includes(next)) throw new Error("Invalid status");

        const ticket = await getTicketForAdmin(opts.ticketId);
        if (!ticket) throw new Error("Not found");
        const prev = ticket.status as $Enums.TicketStatus;

        if (prev === next) return { id: ticket.id, status: next };

        // transition guard
        if (!ALLOWED[prev]?.includes(next)) throw new Error(`Invalid transition: ${prev} → ${next}`);

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

        // notify requester
        if (await shouldSendNotification(ticket.id, "status_changed")) {
            await sendStatusChangedEmail({
                ticketId: ticket.id,
                title: updated.title,
                newStatus: next,
                recipientEmail: updated.user.email,
            });
        }

        return { id: ticket.id, status: next };
    },

    async reopen(opts: { actor: UserCtx; ticketId: string; ip?: string | null }) {
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
        if (!t) throw new Error("Not found");

        const isAdmin = opts.actor.role === "admin";
        const isOwner = t.userId === opts.actor.id;

        if (!isAdmin && !isOwner) throw new Error("Forbidden");

        // must be from RESOLVED (or CLOSED if admin wants to force)
        if (!isAdmin && t.status !== "resolved") {
            throw new Error("Only resolved tickets can be reopened by the requester");
        }

        // window check (users only)
        if (!isAdmin) {
            const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt) : null;
            if (!resolvedAt) throw new Error("Reopen window elapsed");
            const cutoff = new Date(
                resolvedAt.getTime() + REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000
            );
            if (new Date() > cutoff) throw new Error("Reopen window elapsed");
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

        // notify Admin if requester reopened
        if (!isAdmin && (await shouldSendNotification(t.id, "reopened"))) {
            await sendReopenedEmail({
                ticketId: t.id,
                title: t.title,
                adminEmail: process.env.ADMIN_EMAIL!,
            });
        }

        return { id: updated.id, status: "reopened" as $Enums.TicketStatus };
    },
};
