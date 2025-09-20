/**
 * @fileoverview src/features/tickets/components/AdminTicketControls.tsx
 * Admin ticket controls for status and priority updates with optimistic UI
 */

"use client";

import { useTransition, useState } from "react";
import { updateTicketPriorityAction, updateTicketStatusAction } from "@/features/tickets/actions/adminTicket";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { $Enums } from "../../../../generated/prisma";

const statuses = ["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;

export default function AdminTicketControls({ ticketId, currentStatus, currentPriority }:
    { ticketId: string; currentStatus: $Enums.TicketStatus; currentPriority: $Enums.Priority }) {
    const [status, setStatus] = useState<$Enums.TicketStatus>(currentStatus);
    const [priority, setPriority] = useState<$Enums.Priority>(currentPriority);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { addToast } = useToast();

    const hasChanges = status !== currentStatus || priority !== currentPriority;

    const saveAll = async () => {
        if (!hasChanges) { setOpen(false); return; }
        try {
            // Business logic: Batch update status and priority with optimistic UI
            await Promise.all([
                status !== currentStatus
                    ? updateTicketStatusAction(ticketId, status)
                    : Promise.resolve(),
                priority !== currentPriority
                    ? updateTicketPriorityAction(ticketId, priority)
                    : Promise.resolve(),
            ]);
            addToast({
                type: "success",
                title: "Ticket updated",
                message: "Ticket status and priority have been successfully updated."
            });
            startTransition(() => router.refresh());
            setOpen(false);
        } catch (e: unknown) {
            addToast({
                type: "error",
                title: "Failed to update ticket",
                message: e instanceof Error ? e.message : "An unexpected error occurred."
            });
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                className="btn btn-outline btn-md"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                Edit
            </button>

            {open && (
                <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border bg-white p-4 shadow-lg">
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as $Enums.TicketStatus)}
                                className="input"
                            >
                                {statuses.map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as $Enums.Priority)}
                                className="input"
                            >
                                {priorities.map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>


                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setStatus(currentStatus); setPriority(currentPriority); setOpen(false); }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={!hasChanges || isPending}
                                onClick={saveAll}
                            >
                                Save changes
                            </button>
                        </div>

                        {isPending && <p className="text-sm text-gray-600">Saving…</p>}
                    </div>
                </div>
            )}
        </div>
    );
}


