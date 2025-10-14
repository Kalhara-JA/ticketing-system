/**
 * @fileoverview src/features/tickets/components/TicketHeader.tsx
 * Ticket header component with status, priority, and metadata display
 */

"use client";

import { Badge } from "@/components/ui/badge";

export default function TicketHeader({
  title,
  status,
  priority,
  createdAt,
  requester,
  rightSlot,
}: {
  title: string;
  status: string;
  priority: string;
  createdAt: Date | string | number;
  requester?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={
            status === 'resolved' ? 'default' :
            status === 'closed' ? 'secondary' :
            status === 'in_progress' ? 'default' :
            'default'
          }>
            {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
          <Badge variant={
            priority === 'urgent' ? 'destructive' :
            priority === 'high' ? 'default' :
            priority === 'low' ? 'secondary' :
            'default'
          }>
            {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
          </Badge>
          {requester && <span className="text-sm text-muted-foreground">Requester: {requester}</span>}
          <span className="text-sm text-muted-foreground">Created {new Date(createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}


