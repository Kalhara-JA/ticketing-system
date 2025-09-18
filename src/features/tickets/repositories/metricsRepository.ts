import { prisma } from "@/lib/db/prisma";

// Helpful union types (already defined in constants, import if you prefer)
type Status =
    | "new"
    | "in_progress"
    | "waiting_on_user"
    | "resolved"
    | "closed"
    | "reopened";

type Priority = "low" | "normal" | "high" | "urgent";

export async function getStatusCounts() {
    const rows = await prisma.ticket.groupBy({
        by: ["status"],
        _count: { _all: true },
    });
    const map = new Map<Status, number>();
    rows.forEach((r) => map.set(r.status as Status, r._count._all));
    return map;
}

export async function getPriorityCounts() {
    const rows = await prisma.ticket.groupBy({
        by: ["priority"],
        _count: { _all: true },
    });
    const map = new Map<Priority, number>();
    rows.forEach((r) => map.set(r.priority as Priority, r._count._all));
    return map;
}

// Open = not closed & not resolved (tweak if your definition differs)
export async function getOpenCount() {
    const count = await prisma.ticket.count({
        where: { NOT: { status: { in: ["resolved", "closed"] } } },
    });
    return count;
}

export async function getTotalCount() {
    return prisma.ticket.count();
}

// 14-day trend: tickets created per day
export async function getDailyOpened(days = 14) {
    // Postgres only; adjust if you use SQLite for dev
    const rows = await prisma.$queryRaw<
        { day: Date; count: bigint }[]
    >`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "Ticket"
    WHERE "createdAt" >= now() - (${days}::int || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
    return rows.map((r) => ({ day: new Date(r.day), count: Number(r.count) }));
}

// 14-day trend: tickets resolved per day
export async function getDailyResolved(days = 14) {
    const rows = await prisma.$queryRaw<
        { day: Date; count: bigint }[]
    >`
    SELECT date_trunc('day', "resolvedAt") AS day, COUNT(*)::bigint AS count
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL
      AND "resolvedAt" >= now() - (${days}::int || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
    return rows.map((r) => ({ day: new Date(r.day), count: Number(r.count) }));
}

// Average resolution time (in hours) for tickets that have resolvedAt
export async function getAvgResolutionHours() {
    const rows = await prisma.$queryRaw<{ hours: number }[]>`
    SELECT EXTRACT(EPOCH FROM AVG("resolvedAt" - "createdAt")) / 3600 AS hours
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL
  `;
    return rows[0]?.hours ?? null;
}

// Optional: basic ranked FTS search snippet (title+body)
// Use later in lists if you want ranked results (instead of contains)
export async function searchTicketsFTS(query: string, limit = 20) {
    if (!query?.trim()) return [];
    const rows = await prisma.$queryRaw<
        { id: string; title: string; rank: number }[]
    >`
    SELECT "id", "title",
      ts_rank(
        to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("body",'')),
        plainto_tsquery('simple', ${query})
      ) AS rank
    FROM "Ticket"
    WHERE to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("body",''))
          @@ plainto_tsquery('simple', ${query})
    ORDER BY rank DESC, "createdAt" DESC
    LIMIT ${limit}
  `;
    return rows;
}
