/**
 * @fileoverview src/app/admin/tickets/[id]/page.tsx
 * Admin ticket detail page with full access controls and management features
 */

import { requireAdmin } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import ClientCommentForm from "@/features/tickets/components/ClientCommentForm"; // reuse
import ClientAttachmentAdder from "@/features/tickets/components/ClientAttachmentAdder"; // reuse
import AdminTicketControls from "@/features/tickets/components/AdminTicketControls";
import TicketHeader from "@/features/tickets/components/TicketHeader";
import TicketAttachments from "@/features/tickets/components/TicketAttachments";
import TicketComments from "@/features/tickets/components/TicketComments";
import { getAdminTicketDetail } from "@/features/tickets/repositories/ticketRepository";

export const revalidate = 0;

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await requireAdmin();

    const ticket = await getAdminTicketDetail(id);
    if (!ticket) return notFound();

    const attachments = ticket.attachments.map(a => ({ id: a.id, filename: a.filename, uploadedById: a.uploadedById }));

    return (
        <div className="container mx-auto space-y-6 p-6">
            <TicketHeader
                title={ticket.title}
                status={ticket.status}
                priority={ticket.priority}
                createdAt={ticket.createdAt}
                requester={ticket.user.username}
                rightSlot={<AdminTicketControls ticketId={ticket.id} currentStatus={ticket.status} currentPriority={ticket.priority} />}
            />

            {/* Description */}
            <div className="card p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Description</h2>
                <div className="prose prose-sm max-w-none text-gray-900">
                    <p className="whitespace-pre-wrap">{ticket.body}</p>
                </div>
            </div>

            <TicketAttachments items={attachments} after={<ClientAttachmentAdder ticketId={ticket.id} />} canDelete />

            <TicketComments
                comments={ticket.comments}
                after={<ClientCommentForm ticketId={ticket.id} />}
                canDelete
            />
        </div>
    );
}
