/**
 * @fileoverview src/features/tickets/repositories/ticketRepository.ts
 * Database repository functions for ticket queries with search, filtering, and pagination
 */

import { prisma } from "@/lib/db/prisma";
import { PAGE_SIZE_DEFAULT, TICKET_PRIORITIES, TICKET_STATUSES } from "@/features/tickets/constants";
import type { $Enums } from "../../../../generated/prisma";

// Base arguments for ticket listing with search and filtering
type ListArgsBase = {
    q?: string | null;                // search query
    status?: string[] | null;         // filter by status
    priority?: string[] | null;       // filter by priority
    page?: number | null;             // page number (1-based)
    pageSize?: number | null;         // page size
};

// User-specific ticket listing arguments
export type UserListArgs = ListArgsBase & { userId: string };
// Admin ticket listing arguments with optional requester filter
export type AdminListArgs = ListArgsBase & { requester?: string | null };

function buildWhereBase(args: ListArgsBase) {
    const where: {
        OR?: [{ title: { contains: string; mode: "insensitive" } }, { body: { contains: string; mode: "insensitive" } }];
        status?: { in: $Enums.TicketStatus[] };
        priority?: { in: $Enums.Priority[] };
    } = {};
    if (args.q && args.q.trim() !== "") {
        where.OR = [
            { title: { contains: args.q, mode: "insensitive" } },
            { body: { contains: args.q, mode: "insensitive" } },
        ];
    }
    if (args.status && args.status.length) {
        const valid = args.status.filter((s): s is $Enums.TicketStatus => (TICKET_STATUSES as readonly string[]).includes(s));
        if (valid.length) where.status = { in: valid };
    }
    if (args.priority && args.priority.length) {
        const valid = args.priority.filter((p): p is $Enums.Priority => (TICKET_PRIORITIES as readonly string[]).includes(p));
        if (valid.length) where.priority = { in: valid };
    }
    return where;
}

const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export async function listUserTickets(args: UserListArgs) {
    const where = { ...buildWhereBase(args), userId: args.userId };
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.max(1, Math.min(args.pageSize ?? PAGE_SIZE_DEFAULT, 100));
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await prisma.ticket.count({ where });

    // Get the page data
    const items = await prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
            id: true, title: true, status: true, priority: true, createdAt: true,
            comments: { select: { id: true }, take: 1 }, // cheap existence
        },
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return { 
        items, 
        totalCount, 
        totalPages, 
        currentPage: page, 
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}

export async function listAllTickets(args: AdminListArgs) {
    const where = buildWhereBase(args);

    // Admin requester filter by username/email (partial, case-insensitive)
        if (args.requester && args.requester.trim() !== "") {
            // @ts-expect-error extend where for relational filter used only in admin list
            where.user = {
            OR: [
                { username: { contains: args.requester, mode: "insensitive" } },
                { email: { contains: args.requester, mode: "insensitive" } },
            ],
        };
    }

    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.max(1, Math.min(args.pageSize ?? PAGE_SIZE_DEFAULT, 100));
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await prisma.ticket.count({ where });

    // Get the page data
    const items = await prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
            id: true, title: true, status: true, priority: true, createdAt: true,
            user: { select: { username: true, email: true } },
        },
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return { 
        items, 
        totalCount, 
        totalPages, 
        currentPage: page, 
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}

// Detail queries
export async function getUserTicketDetail(userId: string, ticketId: string) {
    return prisma.ticket.findFirst({
        where: { id: ticketId, userId },
        select: {
            id: true,
            title: true,
            body: true,
            status: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            attachments: { select: { id: true, filename: true, uploadedById: true } },
            comments: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    body: true,
                    createdAt: true,
                    deletedAt: true,
                    author: { select: { id: true, username: true, role: true } },
                },
            },
        },
    });
}

export async function getAdminTicketDetail(ticketId: string) {
    return prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true,
            title: true,
            body: true,
            status: true,
            priority: true,
            createdAt: true,
            user: { select: { username: true, email: true } },
            attachments: { select: { id: true, filename: true, key: true, size: true, contentType: true, createdAt: true, uploadedById: true } },
            comments: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    body: true,
                    createdAt: true,
                    deletedAt: true,
                    author: { select: { id: true, username: true, role: true } },
                },
            },
        },
    });
}
