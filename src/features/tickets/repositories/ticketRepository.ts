import { prisma } from "@/lib/db/prisma";
import { PAGE_SIZE_DEFAULT, TICKET_PRIORITIES, TICKET_STATUSES } from "@/features/tickets/constants";

type ListArgsBase = {
    q?: string | null;
    status?: string[] | null;
    priority?: string[] | null;
    page?: number | null;             // page number (1-based)
    pageSize?: number | null;         // page size
};

export type UserListArgs = ListArgsBase & { userId: string };
export type AdminListArgs = ListArgsBase & { requester?: string | null };

function buildWhereBase(args: ListArgsBase) {
    const where: Record<string, unknown> = {};
    if (args.q && args.q.trim() !== "") {
        where.OR = [
            { title: { contains: args.q, mode: "insensitive" } },
            { body: { contains: args.q, mode: "insensitive" } },
        ];
    }
    if (args.status && args.status.length) {
        where.status = { in: args.status.filter(s => (TICKET_STATUSES as readonly string[]).includes(s)) };
    }
    if (args.priority && args.priority.length) {
        where.priority = { in: args.priority.filter(p => (TICKET_PRIORITIES as readonly string[]).includes(p)) };
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
