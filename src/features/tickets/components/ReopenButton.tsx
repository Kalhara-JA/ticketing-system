"use client";
import { useState, useTransition } from "react";
import { reopenTicketAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";

export default function ReopenButton({ ticketId }: { ticketId: string }) {
    const [msg, setMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const doReopen = async () => {
        setMsg(null);
        try {
            await reopenTicketAction(ticketId);
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            setMsg(e instanceof Error ? e.message : "Failed to reopen");
        }
    };

    return (
        <div className="space-y-1">
            <button onClick={doReopen} className="rounded-md border px-3 py-1">Reopen</button>
            {isPending && <p className="text-sm">Reopening…</p>}
            {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
    );
}
