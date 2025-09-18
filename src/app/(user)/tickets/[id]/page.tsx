// src/app/(user)/tickets/[id]/page.tsx
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import ClientCommentForm from "@/features/tickets/components/ClientCommentForm";
import ClientAttachmentAdder from "@/features/tickets/components/ClientAttachmentAdder";
import { REOPEN_WINDOW_DAYS } from "@/features/tickets/constants";
import ReopenButton from "@/features/tickets/components/ReopenButton";

export const revalidate = 0; // keep this; page content is user-specific

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: user.id },          // RBAC: requester only
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      attachments: { select: { id: true, filename: true } }, // no key/contentType needed here
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          deletedAt: true,
          author: { select: { id: true, username: true, role: true } },
        },
      },
    },
  });
  if (!ticket) return notFound();

  const withinWindow =
    ticket.resolvedAt
      ? (Date.now() - new Date(ticket.resolvedAt).getTime()) / 86_400_000 <= REOPEN_WINDOW_DAYS
      : false;

  const canReopen = ticket.status === "resolved" && withinWindow;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{ticket.title}</h1>
          <div className="flex items-center gap-4">
            <span className={`badge badge-outline ${
              ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
              ticket.status === 'closed' ? 'bg-gray-100 text-gray-600' :
              ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {ticket.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className={`badge badge-outline ${
              ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              ticket.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
              ticket.priority === 'low' ? 'bg-gray-100 text-gray-600' :
              'bg-blue-100 text-blue-800'
            }`}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
            </span>
            <span className="text-sm text-muted-foreground">
              Created {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {canReopen && <ReopenButton ticketId={ticket.id} />}
      </div>

      {/* Description */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Description</h2>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap">{ticket.body}</p>
        </div>
      </div>

      {/* Attachments */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Attachments</h2>
        {ticket.attachments.length ? (
          <div className="space-y-2">
            {ticket.attachments.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">📎</span>
                </div>
                <div className="flex-1">
                  <a 
                    className="font-medium text-foreground hover:text-primary transition-colors" 
                    href={`/api/attachments/${a.id}`}
                  >
                    {a.filename}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No attachments yet.</p>
        )}
        <div className="mt-4">
          <ClientAttachmentAdder ticketId={ticket.id} />
        </div>
      </div>

      {/* Comments */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Comments</h2>
        <div className="space-y-4">
          {ticket.comments.map(c => (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-medium text-foreground">{c.author.username}</span>
                {c.author.role === "admin" && (
                  <span className="badge badge-default text-xs">Admin</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              {c.deletedAt ? (
                <div className="italic text-muted-foreground">[Comment deleted]</div>
              ) : (
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              )}
            </div>
          ))}
          {ticket.comments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to add one!
            </p>
          )}
        </div>
        <div className="mt-6">
          <ClientCommentForm ticketId={ticket.id} />
        </div>
      </div>
    </div>
  );
}
