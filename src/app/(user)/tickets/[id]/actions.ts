"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { commentService } from "@/features/comments/services/commentService";
import { attachmentService } from "@/features/attachments/services/attachmentService";
import { AttachmentMeta, CommentInput } from "@/lib/validation/ticketSchemas";
import { ticketService } from "@/features/tickets/services/ticketService";

export async function addCommentAction(input: z.infer<typeof CommentInput>) {
    const user = await requireUser();
    const data = CommentInput.parse(input);
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return commentService.add({ user, ticketId: data.ticketId, body: data.body, ip });
}

export async function deleteCommentAction(commentId: string) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return commentService.softDelete({ user, commentId, ip });
}

export async function addAttachmentsAction(ticketId: string, files: z.infer<typeof AttachmentMeta>[]) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return attachmentService.add({ user, ticketId, files, ip });
}

export async function removeAttachmentAction(attachmentId: string) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return attachmentService.remove({ user, attachmentId, ip });
}

export async function reopenTicketAction(ticketId: string) {
    const user = await requireUser();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.reopen({ actor: { ...user, role: user.role as "user" | "admin" }, ticketId, ip });
}
