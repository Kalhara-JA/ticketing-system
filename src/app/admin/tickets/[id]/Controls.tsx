"use client";

import { useTransition, useState } from "react";
import { updateTicketPriorityAction, updateTicketStatusAction } from "./actions";
import { useRouter } from "next/navigation";

const statuses = ["new", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;

export default function Controls({ ticketId, currentStatus, currentPriority }:
    { ticketId: string; currentStatus: string; currentPriority: string }) {
    const [status, setStatus] = useState(currentStatus);
    const [priority, setPriority] = useState(currentPriority);
    const [msg, setMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const updateStatus = async () => {
        setMsg(null);
        try {
            await updateTicketStatusAction(ticketId, status as "new" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "reopened");
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            setMsg(e instanceof Error ? e.message : "Failed to update status");
        }
    };

    const updatePriority = async () => {
        setMsg(null);
        try {
            await updateTicketPriorityAction(ticketId, priority as "low" | "normal" | "high" | "urgent");
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            setMsg(e instanceof Error ? e.message : "Failed to update priority");
        }
    };

    return (
        <div className="rounded-lg border p-3 space-y-2">
            <div className="flex gap-3 items-end">
                <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border p-2">
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <button onClick={updateStatus} className="rounded-md border px-3 py-2">Update</button>

                <div className="ml-6">
                    <label className="block text-sm font-medium">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md border p-2">
                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <button onClick={updatePriority} className="rounded-md border px-3 py-2">Update</button>
            </div>

            {isPending && <p className="text-sm">Saving…</p>}
            {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
    );
}
