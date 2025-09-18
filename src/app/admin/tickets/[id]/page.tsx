import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { presignDownload } from "@/lib/storage/presign";
import ClientCommentForm from "@/features/tickets/components/ClientCommentForm"; // reuse
import ClientAttachmentAdder from "@/features/tickets/components/ClientAttachmentAdder"; // reuse
import Controls from "./Controls";
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

    const downloads = await Promise.all(
        ticket.attachments.map(async a => ({
            id: a.id, filename: a.filename, url: await presignDownload(a.key, 10 * 60)
        }))
    );



    return (
        <div className="container mx-auto space-y-6 p-6">
            <TicketHeader
                title={ticket.title}
                status={ticket.status}
                priority={ticket.priority}
                createdAt={ticket.createdAt}
                requester={ticket.user.username}
                rightSlot={<Controls ticketId={ticket.id} currentStatus={ticket.status} currentPriority={ticket.priority} />}
            />

            {/* Description */}
            <div className="card p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Description</h2>
                <div className="prose prose-sm max-w-none text-gray-900">
                    <p className="whitespace-pre-wrap">{ticket.body}</p>
                </div>
            </div>

            <TicketAttachments
                items={downloads.map(d => ({ id: d.id, filename: d.filename, url: d.url }))}
                after={<ClientAttachmentAdder ticketId={ticket.id} />}
            />

            <TicketComments
                comments={ticket.comments as any}
                after={<ClientCommentForm ticketId={ticket.id} />}
                canDelete
            />
        </div>
    );
}
