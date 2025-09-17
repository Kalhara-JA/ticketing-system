// src/lib/validation/ticketSchemas.ts
import { z } from "zod";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "./constants";

export const AttachmentMeta = z.object({
    name: z.string().min(1),
    key: z.string().min(1),
    size: z.number().int().min(1).max(ATTACHMENT_MAX_BYTES),
    contentType: z.enum(ATTACHMENT_ALLOWED_TYPES),
});

export const CreateTicketInput = z.object({
    title: z.string().min(3).max(120),
    body: z.string().min(1).max(5000),
    attachments: z.array(AttachmentMeta).max(ATTACHMENT_MAX_COUNT).optional(),
});

export const CommentInput = z.object({
    ticketId: z.string().min(1),
    body: z.string().min(1).max(2000),
});

export const UpdateStatusInput = z.object({
    ticketId: z.string().min(1),
    status: z.enum(["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"]),
});

export const UpdatePriorityInput = z.object({
    ticketId: z.string().min(1),
    priority: z.enum(["low", "normal", "high", "urgent"]),
});

export const SearchTicketsInput = z.object({
    q: z.string().max(200).optional(),
    status: z.array(z.enum(["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"])).optional(),
    priority: z.array(z.enum(["low", "normal", "high", "urgent"])).optional(),
    requesterId: z.string().optional(),
    cursor: z.string().optional(),
    take: z.number().int().min(1).max(100).default(20),
});
