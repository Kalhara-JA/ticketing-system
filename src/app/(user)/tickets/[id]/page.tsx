/**
 * @fileoverview src/app/(user)/tickets/[id]/page.tsx
 * Ticket detail page with comments, attachments, and reopen functionality
 */

import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import ClientCommentForm from "@/features/tickets/components/ClientCommentForm";
import ClientAttachmentAdder from "@/features/tickets/components/ClientAttachmentAdder";
import { REOPEN_WINDOW_DAYS } from "@/features/tickets/constants";
import ReopenButton from "@/features/tickets/components/ReopenButton";
import TicketHeader from "@/features/tickets/components/TicketHeader";
import TicketAttachments from "@/features/tickets/components/TicketAttachments";
import TicketComments from "@/features/tickets/components/TicketComments";
import { getUserTicketDetail } from "@/features/tickets/repositories/ticketRepository";

export const revalidate = 0; // keep this; page content is user-specific

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const ticket = await getUserTicketDetail(user.id, id);
  if (!ticket) return notFound();

  // Business logic: Check if ticket can be reopened within time window
  const withinWindow =
    ticket.resolvedAt
      ? (Date.now() - new Date(ticket.resolvedAt).getTime()) / 86_400_000 <= REOPEN_WINDOW_DAYS
      : false;

  const canReopen = ticket.status === "resolved" && withinWindow;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <TicketHeader
        title={ticket.title}
        status={ticket.status}
        priority={ticket.priority}
        createdAt={ticket.createdAt}
        rightSlot={canReopen ? <ReopenButton ticketId={ticket.id} /> : null}
      />

      {/* Description */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Description</h2>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap">{ticket.body}</p>
        </div>
      </div>

      {/* Attachments */}
      <TicketAttachments
        items={ticket.attachments.map(a => ({ id: a.id, filename: a.filename, uploadedById: a.uploadedById }))}
        after={<ClientAttachmentAdder ticketId={ticket.id} />}
        currentUserId={user.id}
      />

      {/* Comments */}
      <TicketComments
        comments={ticket.comments}
        after={<ClientCommentForm ticketId={ticket.id} />}
        currentUserId={user.id}
      />
    </div>
  );
}
