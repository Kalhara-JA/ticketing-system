/**
 * @fileoverview src/features/tickets/repositories/metricsRepository.ts
 * Database repository functions for ticket metrics, analytics, and full-text search
 */

import { prisma } from "@/lib/db/prisma";

// Ticket status and priority types for metrics
type Status =
    | "new"
    | "in_progress"
    | "waiting_on_user"
    | "resolved"
    | "closed"
    | "reopened";

type Priority = "low" | "normal" | "high" | "urgent";

/**
 * Gets count of tickets grouped by status
 * @returns {Promise<Map<Status, number>>} Map of status to count
 */
export async function getStatusCounts() {
    const rows = await prisma.ticket.groupBy({
        by: ["status"],
        _count: { _all: true },
    });
    const map = new Map<Status, number>();
    rows.forEach((r) => map.set(r.status as Status, r._count._all));
    return map;
}

/**
 * Gets count of tickets grouped by priority
 * @returns {Promise<Map<Priority, number>>} Map of priority to count
 */
export async function getPriorityCounts() {
    const rows = await prisma.ticket.groupBy({
        by: ["priority"],
        _count: { _all: true },
    });
    const map = new Map<Priority, number>();
    rows.forEach((r) => map.set(r.priority as Priority, r._count._all));
    return map;
}

/**
 * Gets count of open tickets (not resolved or closed)
 * @returns {Promise<number>} Count of open tickets
 */
export async function getOpenCount() {
    const count = await prisma.ticket.count({
        where: { NOT: { status: { in: ["resolved", "closed"] } } },
    });
    return count;
}

/**
 * Gets total count of all tickets
 * @returns {Promise<number>} Total ticket count
 */
export async function getTotalCount() {
    return prisma.ticket.count();
}

/**
 * Gets daily ticket creation trend for the specified number of days
 * @param {number} days - Number of days to look back (default: 14)
 * @returns {Promise<Array<{day: Date, count: number}>>} Array of daily counts
 */
export async function getDailyOpened(days = 14) {
    // PostgreSQL-specific query for daily aggregation
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

/**
 * Gets daily ticket resolution trend for the specified number of days
 * @param {number} days - Number of days to look back (default: 14)
 * @returns {Promise<Array<{day: Date, count: number}>>} Array of daily resolution counts
 */
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

/**
 * Gets average resolution time in hours for resolved tickets
 * @returns {Promise<number | null>} Average resolution time in hours, or null if no resolved tickets
 */
export async function getAvgResolutionHours() {
    const rows = await prisma.$queryRaw<{ hours: number }[]>`
    SELECT EXTRACT(EPOCH FROM AVG("resolvedAt" - "createdAt")) / 3600 AS hours
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL
  `;
    return rows[0]?.hours ?? null;
}

/**
 * Full-text search for tickets using PostgreSQL's tsvector and tsquery
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array<{id: string, title: string, rank: number}>>} Ranked search results
 */
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
