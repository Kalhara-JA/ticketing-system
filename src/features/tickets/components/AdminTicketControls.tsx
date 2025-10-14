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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="default">
                    Edit
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Edit Ticket</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as $Enums.TicketStatus)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={priority} onValueChange={(value) => setPriority(value as $Enums.Priority)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorities.map(p => (
                                        <SelectItem key={p} value={p}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => { setStatus(currentStatus); setPriority(currentPriority); setOpen(false); }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={!hasChanges || isPending}
                                onClick={saveAll}
                            >
                                Save changes
                            </Button>
                        </div>

                        {isPending && <p className="text-sm text-muted-foreground">Saving…</p>}
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}


