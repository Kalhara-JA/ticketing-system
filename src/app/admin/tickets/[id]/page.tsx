import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { presignDownload } from "@/lib/storage/presign";
import ClientCommentForm from "@/features/tickets/components/ClientCommentForm"; // reuse
import ClientAttachmentAdder from "@/features/tickets/components/ClientAttachmentAdder"; // reuse
import Controls from "./Controls";

export const revalidate = 0;

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await requireAdmin();

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: {
            id: true, title: true, body: true, status: true, priority: true, createdAt: true,
            user: { select: { username: true, email: true } },
            attachments: { select: { id: true, filename: true, key: true, size: true, contentType: true, createdAt: true } },
            comments: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true, body: true, createdAt: true, deletedAt: true,
                    author: { select: { id: true, username: true, role: true } },
                }
            }
        }
    });
    if (!ticket) return notFound();

    const downloads = await Promise.all(
        ticket.attachments.map(async a => ({
            id: a.id, filename: a.filename, url: await presignDownload(a.key, 10 * 60)
        }))
    );



    return (
        <div className="space-y-6">
            <section className="space-y-1">
                <h1 className="text-xl font-semibold">{ticket.title}</h1>
                <p className="opacity-80 text-sm">Requester: {ticket.user.username} · Status: {ticket.status} · Priority: {ticket.priority}</p>
                <p className="whitespace-pre-wrap">{ticket.body}</p>
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Attachments</h2>
                {downloads.length ? (
                    <ul className="list-disc pl-5">
                        {downloads.map(d => (
                            <li key={d.id}><a className="underline" href={d.url}>{d.filename}</a></li>
                        ))}
                    </ul>
                ) : <p className="opacity-70 text-sm">No attachments yet.</p>}
                <ClientAttachmentAdder ticketId={ticket.id} />
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Comments</h2>
                <div className="space-y-3">
                    {ticket.comments.map(c => (
                        <div key={c.id} className="rounded-lg border p-3">
                            <div className="mb-1 text-sm opacity-70">
                                {c.author.username} {c.author.role === "admin" && "(Admin)"} · {new Date(c.createdAt).toLocaleString()}
                            </div>
                            {c.deletedAt ? <div className="italic opacity-60">[deleted]</div> : <div className="whitespace-pre-wrap">{c.body}</div>}
                        </div>
                    ))}
                </div>
                <ClientCommentForm ticketId={ticket.id} />
            </section>

            <Controls ticketId={ticket.id} currentStatus={ticket.status} currentPriority={ticket.priority} />

        </div>
    );
}
