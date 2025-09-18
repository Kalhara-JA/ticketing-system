import { prisma } from "@/lib/db/prisma";

export async function audit(
    actorId: string | null,
    action: string,
    targetType: "ticket" | "comment" | "attachment",
    targetId: string,
    changes?: Record<string, unknown>,
    ip?: string | null
) {
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
}
