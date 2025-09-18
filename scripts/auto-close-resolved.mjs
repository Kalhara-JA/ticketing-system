import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const AUTO_CLOSE_DAYS = Number(process.env.AUTO_CLOSE_DAYS ?? 14);

async function main() {
    const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);

    // Find resolved tickets older than cutoff
    const tickets = await prisma.ticket.findMany({
        where: {
            status: "resolved",
            resolvedAt: { lte: cutoff },
        },
        select: { id: true, title: true, user: { select: { email: true } } },
    });

    for (const t of tickets) {
        await prisma.$transaction(async (tx) => {
            await tx.ticket.update({
                where: { id: t.id },
                data: { status: "closed", closedAt: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    actorId: null, // system
                    action: "ticket:auto_close",
                    targetType: "ticket",
                    targetId: t.id,
                    changes: { to: "closed" },
                },
            });
        });

        // optional: simple email (no de-dup needed here; runs hourly/daily)
        try {
            const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
            const link = `${base}/tickets/${t.id}`;
            const html = `<!doctype html><html><body style="font-family:system-ui">
        <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
          <h2 style="margin:0 0 12px">Ticket closed</h2>
          <p>Your ticket <strong>${escapeHtml(t.title)}</strong> was closed automatically.</p>
          <p><a href="${link}">Open Ticket</a></p>
        </div>
      </body></html>`;
            const { Resend } = await import("@resend/node");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: "Support <no-reply@" + new URL(base).hostname + ">",
                to: t.user.email,
                subject: `Closed: ${t.title}`,
                html,
            });
        } catch (e) {
            console.error("Email failed for ticket", t.id, e?.message);
        }
    }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
