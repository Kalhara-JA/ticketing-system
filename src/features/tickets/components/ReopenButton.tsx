/**
 * @fileoverview src/features/tickets/components/ReopenButton.tsx
 * Ticket reopen button with business logic validation and user feedback
 */

"use client";
import { useState, useTransition } from "react";
import { reopenTicketAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function ReopenButton({ ticketId }: { ticketId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { addToast } = useToast();

    const doReopen = async () => {
        try {
            await reopenTicketAction(ticketId);
            addToast({
                type: "success",
                title: "Ticket reopened",
                message: "The ticket has been successfully reopened."
            });
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            addToast({
                type: "error",
                title: "Failed to reopen ticket",
                message: e instanceof Error ? e.message : "An unexpected error occurred."
            });
        }
    };

    return (
        <div className="space-y-1">
            <button onClick={doReopen} className="rounded-md border px-3 py-1" disabled={isPending}>
                {isPending ? "Reopening…" : "Reopen"}
            </button>
        </div>
    );
}
