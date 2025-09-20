/**
 * @fileoverview src/features/audit/auditRepository.ts
 * Database repository functions for audit log queries with filtering and pagination
 */

import { prisma } from "@/lib/db/prisma";

/**
 * Lists audit logs with filtering and pagination
 * @param {Object} opts - Query options
 * @param {number} opts.page - Page number (1-based)
 * @param {number} opts.pageSize - Number of items per page
 * @param {string} opts.actor - Username or email partial match
 * @param {string} opts.targetType - Target type filter
 * @param {string} opts.action - Action filter
 * @returns {Promise<Object>} Paginated audit log results
 */
export async function listAuditLogs(opts: {
  page?: number;
  pageSize?: number;
  actor?: string; // username or email partial
  targetType?: string;
  action?: string;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(opts.pageSize ?? 20, 100));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (opts.targetType) where.targetType = { contains: opts.targetType, mode: "insensitive" };
  if (opts.action) where.action = { contains: opts.action, mode: "insensitive" };
  if (opts.actor && opts.actor.trim() !== "") {
    where.actor = {
      OR: [
        { username: { contains: opts.actor, mode: "insensitive" } },
        { email: { contains: opts.actor, mode: "insensitive" } },
      ],
    };
  }

  const [totalCount, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        changes: true,
        ip: true,
        createdAt: true,
        actor: { select: { username: true, email: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  return {
    items,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}


