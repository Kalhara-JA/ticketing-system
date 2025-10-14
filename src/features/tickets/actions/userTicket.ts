/**
 * @fileoverview src/features/tickets/actions/userTicket.ts
 * Server actions for user ticket operations (comments, attachments, reopen)
 */

"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { commentService } from "@/features/comments/services/commentService";
import { attachmentService } from "@/features/attachments/services/attachmentService";
import { AttachmentMeta, CommentInput } from "@/lib/validation/ticketSchemas";
import { ticketService } from "@/features/tickets/services/ticketService";
import { getEnv } from "@/lib/validation/env";
import type { $Enums } from "../../../../generated/prisma";

/**
 * Adds a comment to a ticket with validation and audit logging
 * @param {z.infer<typeof CommentInput>} input - Validated comment input data
 * @returns {Promise<{id: string}>} Created comment ID
 * @throws {Error} When validation fails or user lacks permission
 */
export async function addCommentAction(input: z.infer<typeof CommentInput>) {
    const user = await requireUser();
    const data = CommentInput.parse(input);
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return commentService.add({ user, ticketId: data.ticketId, body: data.body, ip });
}

/**
 * Soft deletes a comment (admin or comment author only)
 * @param {string} commentId - ID of comment to delete
 * @returns {Promise<{id: string}>} Deleted comment ID
 * @throws {Error} When user lacks permission or comment not found
 */
export async function deleteCommentAction(commentId: string) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return commentService.softDelete({ user, commentId, ip });
}

/**
 * Adds attachments to a ticket with validation and file limits
 * @param {string} ticketId - Ticket ID to add attachments to
 * @param {z.infer<typeof AttachmentMeta>[]} files - Array of validated attachment metadata
 * @returns {Promise<{added: number}>} Number of attachments added
 * @throws {Error} When validation fails or attachment limit exceeded
 */
export async function addAttachmentsAction(ticketId: string, files: z.infer<typeof AttachmentMeta>[]) {
    // Check if attachments are enabled
    const env = getEnv();
    if (!env.ENABLE_ATTACHMENTS) {
        throw new Error("Attachment functionality is currently disabled.");
    }

    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return attachmentService.add({ user, ticketId, files, ip });
}

/**
 * Removes an attachment (admin, ticket owner, or attachment uploader only)
 * @param {string} attachmentId - ID of attachment to remove
 * @returns {Promise<{id: string, ticketId: string}>} Removed attachment and ticket IDs
 * @throws {Error} When user lacks permission or attachment not found
 */
export async function removeAttachmentAction(attachmentId: string) {
    // Check if attachments are enabled
    const env = getEnv();
    if (!env.ENABLE_ATTACHMENTS) {
        throw new Error("Attachment functionality is currently disabled.");
    }

    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return attachmentService.remove({ user, attachmentId, ip });
}

/**
 * Reopens a resolved ticket (admin or ticket owner only, within time window)
 * @param {string} ticketId - ID of ticket to reopen
 * @returns {Promise<{id: string, status: string}>} Updated ticket ID and status
 * @throws {Error} When user lacks permission or reopen window expired
 */
export async function reopenTicketAction(ticketId: string) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.reopen({ actor: { ...user, role: user.role as $Enums.Role }, ticketId, ip });
}


