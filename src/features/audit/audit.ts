/**
 * @fileoverview src/features/audit/audit.ts
 * Audit logging function for tracking user actions and system changes
 */

import { prisma } from "@/lib/db/prisma";

/**
 * Records an audit log entry for user actions and system changes
 * @param {string | null} actorId - ID of the user performing the action (null for system)
 * @param {string} action - Action being performed (e.g., 'ticket:create', 'comment:delete')
 * @param {string} targetType - Type of target being acted upon
 * @param {string} targetId - ID of the target object
 * @param {Record<string, unknown>} changes - Optional changes data
 * @param {string | null} ip - Optional IP address for security tracking
 * @returns {Promise<void>} Resolves when audit log is created
 */
export async function audit(
    actorId: string | null,
    action: string,
    targetType: "ticket" | "comment" | "attachment",
    targetId: string,
    changes?: Record<string, unknown>,
    ip?: string | null
) {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: actorId ?? null,
                action,
                targetType,
                targetId,
                changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
                ip: ip ?? undefined,
            },
        });
    } catch (error) {
        console.error("Audit log creation failed:", { actorId, action, targetType, targetId, error });
        throw error;
    }
}
