"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/session";
import { ticketService } from "@/features/tickets/services/ticketService";
import type { $Enums } from "../../../../generated/prisma";

export async function updateTicketPriorityAction(ticketId: string, priority: $Enums.Priority) {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updatePriority({ admin: { ...admin, role: admin.role as $Enums.Role }, ticketId, priority, ip });
}

export async function updateTicketStatusAction(ticketId: string, status: $Enums.TicketStatus) {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updateStatus({ admin: { ...admin, role: admin.role as $Enums.Role }, ticketId, status, ip });
}


