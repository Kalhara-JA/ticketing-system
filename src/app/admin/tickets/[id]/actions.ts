"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/session";
import { ticketService } from "@/features/tickets/services/ticketService";

export async function updateTicketPriorityAction(ticketId: string, priority: "low" | "normal" | "high" | "urgent") {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updatePriority({ admin: { ...admin, role: admin.role as "user" | "admin" }, ticketId, priority, ip });
}

export async function updateTicketStatusAction(ticketId: string, status: "new" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "reopened") {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updateStatus({ admin: { ...admin, role: admin.role as "user" | "admin" }, ticketId, status, ip });
}
