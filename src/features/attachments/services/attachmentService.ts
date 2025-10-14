/**
 * @fileoverview src/features/attachments/services/attachmentService.ts
 * Attachment management service with file validation and RBAC
 */

import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/validation/env";

// Security: User-specific storage key prefix for attachment isolation
const PREFIX = (uid: string) => `u/${uid}/`;

/**
 * Ensures user has permission to edit a ticket (admin or ticket owner)
 * @param {Object} user - User object with id and role
 * @param {string} ticketId - Ticket ID to check access for
 * @returns {Promise<boolean>} True if user can edit the ticket
 * @throws {Error} When user lacks permission
 */
async function ensureCanEditTicket(user: { id: string; role: string }, ticketId: string) {
    if (user.role === "admin") return true;
    const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id }, select: { id: true } });
    if (!t) {
        logger.error("Unauthorized attachment operation attempt", {
            userId: user.id,
            userRole: user.role,
            ticketId,
        });
        throw new Error("You don't have permission to add attachments to this ticket.");
    }
}

export const attachmentService = {
    async add(opts: {
        user: { id: string; role: string };
        ticketId: string;
        files: Array<{ name: string; key: string; size: number; contentType: string }>;
        ip?: string | null;
    }) {
        // Check if attachments are enabled
        const env = getEnv();
        if (!env.ENABLE_ATTACHMENTS) {
            logger.error("Attachment feature disabled", {
                userId: opts.user.id,
                ticketId: opts.ticketId,
            });
            throw new Error("Attachment functionality is currently disabled.");
        }

        logger.attachmentOperation("add started", "new", opts.user.id, {
            ticketId: opts.ticketId,
            fileCount: opts.files.length,
            fileNames: opts.files.map(f => f.name),
            ip: opts.ip,
        });

        await ensureCanEditTicket(opts.user, opts.ticketId);

        // Ensure keys belong to the user
        for (const f of opts.files) {
            if (!f.key.startsWith(PREFIX(opts.user.id)) && opts.user.role !== "admin") {
                logger.error("Invalid attachment key detected", {
                    userId: opts.user.id,
                    ticketId: opts.ticketId,
                    fileName: f.name,
                    attachmentKey: f.key,
                    expectedPrefix: PREFIX(opts.user.id),
                });
                throw new Error("Invalid attachment key. Please try uploading again.");
            }
        }

        // Enforce cap: up to 5 attachments total per ticket
        const count = await prisma.attachment.count({ where: { ticketId: opts.ticketId } });
        if (count + opts.files.length > 5) {
            logger.error("Attachment limit exceeded", {
                userId: opts.user.id,
                ticketId: opts.ticketId,
                currentCount: count,
                tryingToAdd: opts.files.length,
                totalWouldBe: count + opts.files.length,
            });
            throw new Error(`Maximum 5 attachments allowed. You currently have ${count} attachments and are trying to add ${opts.files.length} more.`);
        }

        const created = await prisma.attachment.createMany({
            data: opts.files.map(f => ({
                ticketId: opts.ticketId,
                filename: f.name,
                key: f.key,
                size: f.size,
                contentType: f.contentType,
                uploadedById: opts.user.id,
            })),
            skipDuplicates: true,
        });

        await audit(opts.user.id, "attachment:add", "ticket", opts.ticketId, { count: created.count }, opts.ip ?? null);
        
        logger.attachmentOperation("added successfully", "new", opts.user.id, {
            ticketId: opts.ticketId,
            addedCount: created.count,
            fileNames: opts.files.map(f => f.name),
        });

        return { added: created.count };
    },

    async remove(opts: { user: { id: string; role: string }, attachmentId: string, ip?: string | null }) {
        // Check if attachments are enabled
        const env = getEnv();
        if (!env.ENABLE_ATTACHMENTS) {
            logger.error("Attachment feature disabled", {
                userId: opts.user.id,
                attachmentId: opts.attachmentId,
            });
            throw new Error("Attachment functionality is currently disabled.");
        }

        logger.attachmentOperation("remove started", opts.attachmentId, opts.user.id, {
            userRole: opts.user.role,
            ip: opts.ip,
        });

        // Author or admin can remove; we'll check via join
        const a = await prisma.attachment.findUnique({
            where: { id: opts.attachmentId },
            select: { id: true, key: true, ticket: { select: { id: true, userId: true } }, uploadedById: true },
        });
        if (!a) {
            logger.error("Attachment not found for removal", {
                userId: opts.user.id,
                attachmentId: opts.attachmentId,
            });
            throw new Error("Attachment not found.");
        }
        
        if (!(opts.user.role === "admin" || a.uploadedById === opts.user.id || a.ticket.userId === opts.user.id)) {
            logger.error("Unauthorized attachment removal attempt", {
                userId: opts.user.id,
                userRole: opts.user.role,
                attachmentId: opts.attachmentId,
                attachmentUploaderId: a.uploadedById,
                ticketOwnerId: a.ticket.userId,
            });
            throw new Error("You don't have permission to remove this attachment.");
        }

        await prisma.attachment.delete({ where: { id: a.id } });
        await audit(opts.user.id, "attachment:remove", "ticket", a.ticket.id, { attachmentId: a.id }, opts.ip ?? null);
        
        logger.attachmentOperation("removed successfully", opts.attachmentId, opts.user.id, {
            ticketId: a.ticket.id,
            attachmentKey: a.key,
        });

        return { id: a.id, ticketId: a.ticket.id };
    },
};
