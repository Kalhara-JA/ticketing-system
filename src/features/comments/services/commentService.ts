import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";
import { shouldSendNotification } from "@/lib/email/notify";
import { sendCommentAddedEmail } from "@/features/tickets/email";

// Basic RBAC helpers for this feature
async function canReadTicket(user: { id: string; role: string }, ticketId: string) {
    if (user.role === "admin") return true;
    const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id }, select: { id: true } });
    return !!t;
}

export const commentService = {
    async add(opts: {
        user: { id: string; role: string; email: string };
        ticketId: string;
        body: string;
        ip?: string | null;
    }) {
        const allowed = await canReadTicket(opts.user, opts.ticketId);
        if (!allowed) throw new Error("Forbidden");

        const comment = await prisma.comment.create({
            data: {
                ticketId: opts.ticketId,
                authorId: opts.user.id,
                body: opts.body,
            },
            select: {
                id: true,
                ticket: { select: { id: true, title: true, userId: true, user: { select: { email: true } } } },
            },
        });

        await audit(opts.user.id, "comment:add", "comment", comment.id, { ticketId: opts.ticketId }, opts.ip ?? null);

        // Notify the "other party"
        const isAdmin = opts.user.role === "admin";
        const recipientEmail = isAdmin ? comment.ticket.user.email : process.env.ADMIN_EMAIL!;
        if (await shouldSendNotification(opts.ticketId, "comment_added")) {
            await sendCommentAddedEmail({
                ticketId: comment.ticket.id,
                title: comment.ticket.title,
                recipientEmail,
            });
        }

        return { id: comment.id };
    },

    async softDelete(opts: {
        user: { id: string; role: string };
        commentId: string;
        ip?: string | null;
    }) {
        // Only admins or the author can soft-delete
        const comment = await prisma.comment.findUnique({
            where: { id: opts.commentId },
            select: { id: true, authorId: true, ticketId: true },
        });
        if (!comment) throw new Error("Not found");
        if (!(opts.user.role === "admin" || comment.authorId === opts.user.id)) throw new Error("Forbidden");

        await prisma.comment.update({
            where: { id: comment.id },
            data: { deletedAt: new Date() },
        });
        await audit(opts.user.id, "comment:delete", "comment", comment.id, { ticketId: comment.ticketId }, opts.ip ?? null);
        return { id: comment.id };
    },
};
