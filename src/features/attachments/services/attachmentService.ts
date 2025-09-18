import { prisma } from "@/lib/db/prisma";
import { audit } from "@/features/audit/audit";

const PREFIX = (uid: string) => `u/${uid}/`;

async function ensureCanEditTicket(user: { id: string; role: string }, ticketId: string) {
    if (user.role === "admin") return true;
    const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: user.id }, select: { id: true } });
    if (!t) throw new Error("Forbidden");
}

export const attachmentService = {
    async add(opts: {
        user: { id: string; role: string };
        ticketId: string;
        files: Array<{ name: string; key: string; size: number; contentType: string }>;
        ip?: string | null;
    }) {
        await ensureCanEditTicket(opts.user, opts.ticketId);

        // Ensure keys belong to the user
        for (const f of opts.files) {
            if (!f.key.startsWith(PREFIX(opts.user.id)) && opts.user.role !== "admin") {
                throw new Error("Invalid key");
            }
        }

        // Enforce cap: up to 5 attachments total per ticket
        const count = await prisma.attachment.count({ where: { ticketId: opts.ticketId } });
        if (count + opts.files.length > 5) throw new Error("Too many attachments");

        const created = await prisma.attachment.createMany({
            data: opts.files.map(f => ({
                ticketId: opts.ticketId,
                filename: f.name,
                key: f.key,
                size: f.size,
                contentType: f.contentType,
                uploadedById: opts.user.id,
            })),
            skipDuplicates: true,
        });

        await audit(opts.user.id, "attachment:add", "ticket", opts.ticketId, { count: created.count }, opts.ip ?? null);
        return { added: created.count };
    },

    async remove(opts: { user: { id: string; role: string }, attachmentId: string, ip?: string | null }) {
        // Author or admin can remove; we’ll check via join
        const a = await prisma.attachment.findUnique({
            where: { id: opts.attachmentId },
            select: { id: true, key: true, ticket: { select: { id: true, userId: true } }, uploadedById: true },
        });
        if (!a) throw new Error("Not found");
        if (!(opts.user.role === "admin" || a.uploadedById === opts.user.id || a.ticket.userId === opts.user.id)) {
            throw new Error("Forbidden");
        }

        await prisma.attachment.delete({ where: { id: a.id } });
        await audit(opts.user.id, "attachment:remove", "ticket", a.ticket.id, { attachmentId: a.id }, opts.ip ?? null);
        return { id: a.id, ticketId: a.ticket.id };
    },
};
