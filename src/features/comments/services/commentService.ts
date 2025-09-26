/**
 * @fileoverview src/features/comments/services/commentService.ts
 * Comment management service with RBAC and email notifications
 */

import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";
import { shouldSendNotification } from "@/lib/email/notify";
import { sendCommentAddedEmail } from "@/features/tickets/email";
import { getAdminEmail } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import { escapeHtml } from "@/lib/validation/sanitize";

/**
 * Checks if user has permission to read a ticket (admin or ticket owner)
 * @param {Object} user - User object with id and role
 * @param {string} ticketId - Ticket ID to check access for
 * @returns {Promise<boolean>} True if user can read the ticket
 */
async function canReadTicket(user: { id: string; role: string }, ticketId: string) {
    if (user.role === "admin") return true;
    const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id }, select: { id: true } });
    return !!t;
}

export const commentService = {
    async add(opts: {
        user: { id: string; role: string; email: string };
        ticketId: string;
        body: string;
        ip?: string | null;
    }) {
        logger.commentOperation("add started", "new", opts.user.id, {
            ticketId: opts.ticketId,
            bodyLength: opts.body.length,
            ip: opts.ip,
        });

        const allowed = await canReadTicket(opts.user, opts.ticketId);
        if (!allowed) {
            logger.error("Unauthorized comment add attempt", {
                userId: opts.user.id,
                userRole: opts.user.role,
                ticketId: opts.ticketId,
            });
            throw new Error("Forbidden");
        }

        const sanitizedBody = escapeHtml(opts.body);

        const comment = await prisma.comment.create({
            data: {
                ticketId: opts.ticketId,
                authorId: opts.user.id,
                body: sanitizedBody,
            },
            select: {
                id: true,
                ticket: { select: { id: true, title: true, userId: true, user: { select: { email: true } } } },
            },
        });

        await audit(opts.user.id, "comment:add", "comment", comment.id, { ticketId: opts.ticketId }, opts.ip ?? null);

        logger.commentOperation("added successfully", comment.id, opts.user.id, {
            ticketId: opts.ticketId,
            bodyLength: opts.body.length,
        });

        // Notify the "other party"
        const isAdmin = opts.user.role === "admin";
        const recipientEmail = isAdmin ? comment.ticket.user.email : getAdminEmail();
        if (await shouldSendNotification(opts.ticketId, "comment_added")) {
            try {
                await sendCommentAddedEmail({
                    ticketId: comment.ticket.id,
                    title: comment.ticket.title,
                    recipientEmail,
                }, isAdmin ? "user" : "admin");
                logger.emailOperation("comment notification sent", recipientEmail, {
                    ticketId: comment.ticket.id,
                    commentId: comment.id,
                    recipientType: isAdmin ? "user" : "admin",
                });
            } catch (error) {
                logger.error("Failed to send comment notification", {
                    ticketId: comment.ticket.id,
                    commentId: comment.id,
                    recipientEmail,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        return { id: comment.id };
    },

    async softDelete(opts: {
        user: { id: string; role: string };
        commentId: string;
        ip?: string | null;
    }) {
        logger.commentOperation("delete started", opts.commentId, opts.user.id, {
            userRole: opts.user.role,
            ip: opts.ip,
        });

        // Only admins or the author can soft-delete
        const comment = await prisma.comment.findUnique({
            where: { id: opts.commentId },
            select: { id: true, authorId: true, ticketId: true },
        });
        if (!comment) {
            logger.error("Comment not found for deletion", {
                userId: opts.user.id,
                commentId: opts.commentId,
            });
            throw new Error("Not found");
        }
        
        if (!(opts.user.role === "admin" || comment.authorId === opts.user.id)) {
            logger.error("Unauthorized comment deletion attempt", {
                userId: opts.user.id,
                userRole: opts.user.role,
                commentId: opts.commentId,
                commentAuthorId: comment.authorId,
            });
            throw new Error("Forbidden");
        }

        await prisma.comment.update({
            where: { id: comment.id },
            data: { deletedAt: new Date() },
        });
        await audit(opts.user.id, "comment:delete", "comment", comment.id, { ticketId: comment.ticketId }, opts.ip ?? null);
        
        logger.commentOperation("deleted successfully", opts.commentId, opts.user.id, {
            ticketId: comment.ticketId,
        });

        return { id: comment.id };
    },
};
