/**
 * @fileoverview src/lib/validation/ticketSchemas.ts
 * Zod validation schemas for ticket-related operations and data validation
 */

import { z } from "zod";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "./constants";
import { PAGE_SIZE_DEFAULT } from "@/features/tickets/constants";

// Attachment metadata validation schema
export const AttachmentMeta = z.object({
    name: z.string().min(1),
    key: z.string().min(1),
    size: z.number().int().min(1).max(ATTACHMENT_MAX_BYTES),
    contentType: z.enum(ATTACHMENT_ALLOWED_TYPES),
});

// Ticket creation input validation schema
export const CreateTicketInput = z.object({
    title: z.string().min(3).max(120),
    body: z.string().min(1).max(5000),
    attachments: z.array(AttachmentMeta).max(ATTACHMENT_MAX_COUNT).optional(),
});

// Comment creation input validation schema
export const CommentInput = z.object({
    ticketId: z.string().min(1),
    body: z.string().min(1).max(2000),
});

// Ticket status update validation schema
export const UpdateStatusInput = z.object({
    ticketId: z.string().min(1),
    status: z.enum(["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"]),
});

// Ticket priority update validation schema
export const UpdatePriorityInput = z.object({
    ticketId: z.string().min(1),
    priority: z.enum(["low", "normal", "high", "urgent"]),
});

// Ticket search and filtering validation schema
export const SearchTicketsInput = z.object({
    q: z.string().max(200).optional(),
    status: z.array(z.enum(["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"])).optional(),
    priority: z.array(z.enum(["low", "normal", "high", "urgent"])).optional(),
    requesterId: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(PAGE_SIZE_DEFAULT),
});
