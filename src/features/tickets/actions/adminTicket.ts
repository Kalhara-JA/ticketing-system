/**
 * @fileoverview src/features/tickets/actions/adminTicket.ts
 * Server actions for admin ticket operations (status and priority updates)
 */

"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/session";
import { ticketService } from "@/features/tickets/services/ticketService";
import type { $Enums } from "../../../../generated/prisma";

/**
 * Updates ticket priority (admin only)
 * @param {string} ticketId - ID of ticket to update
 * @param {$Enums.Priority} priority - New priority value
 * @returns {Promise<{id: string, priority: string}>} Updated ticket ID and priority
 * @throws {Error} When user is not admin or ticket not found
 */
export async function updateTicketPriorityAction(ticketId: string, priority: $Enums.Priority) {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updatePriority({ admin: { ...admin, role: admin.role as $Enums.Role }, ticketId, priority, ip });
}

/**
 * Updates ticket status (admin only)
 * @param {string} ticketId - ID of ticket to update
 * @param {$Enums.TicketStatus} status - New status value
 * @returns {Promise<{id: string, status: string}>} Updated ticket ID and status
 * @throws {Error} When user is not admin or ticket not found
 */
export async function updateTicketStatusAction(ticketId: string, status: $Enums.TicketStatus) {
    const admin = await requireAdmin();
    const ip = (await headers()).get("x-forwarded-for") ?? null;
    return ticketService.updateStatus({ admin: { ...admin, role: admin.role as $Enums.Role }, ticketId, status, ip });
}


