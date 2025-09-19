import pkg from "../generated/prisma/index.js";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const AUTO_CLOSE_DAYS = Number(process.env.AUTO_CLOSE_DAYS ?? 14);

export async function main() {
    console.log(`[AUTO-CLOSE] Starting auto-close job with AUTO_CLOSE_DAYS=${AUTO_CLOSE_DAYS}`);
    
    const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);
    console.log(`[AUTO-CLOSE] Cutoff date: ${cutoff.toISOString()}`);

    // Find resolved tickets older than cutoff
    console.log(`[AUTO-CLOSE] Searching for resolved tickets older than cutoff...`);
    const tickets = await prisma.ticket.findMany({
        where: {
            status: "resolved",
            resolvedAt: { lte: cutoff },
        },
        select: { id: true, title: true, user: { select: { email: true } } },
    });

    console.log(`[AUTO-CLOSE] Found ${tickets.length} tickets to close`);

    if (tickets.length === 0) {
        console.log(`[AUTO-CLOSE] No tickets to close. Job completed.`);
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const t of tickets) {
        console.log(`[AUTO-CLOSE] Processing ticket ${t.id}: "${t.title}"`);
        
        try {
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
            console.log(`[AUTO-CLOSE] ✅ Successfully closed ticket ${t.id}`);
            successCount++;
        } catch (error) {
            console.error(`[AUTO-CLOSE] ❌ Failed to close ticket ${t.id}:`, error.message);
            errorCount++;
            continue; // Skip email for failed tickets
        }

        // Send email notification
        console.log(`[AUTO-CLOSE] Sending email notification to ${t.user.email} for ticket ${t.id}`);
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
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: t.user.email,
                subject: `Closed: ${t.title}`,
                html,
            });
            console.log(`[AUTO-CLOSE] ✅ Email sent successfully to ${t.user.email} for ticket ${t.id}`);
        } catch (e) {
            console.error(`[AUTO-CLOSE] ❌ Email failed for ticket ${t.id}:`, e?.message);
        }
    }

    console.log(`[AUTO-CLOSE] Job completed. Summary:`);
    console.log(`[AUTO-CLOSE] - Total tickets processed: ${tickets.length}`);
    console.log(`[AUTO-CLOSE] - Successfully closed: ${successCount}`);
    console.log(`[AUTO-CLOSE] - Errors: ${errorCount}`);
}

export function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// Only run main if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`[AUTO-CLOSE] Auto-close job started at ${new Date().toISOString()}`);
  main()
    .catch((e) => { 
      console.error(`[AUTO-CLOSE] ❌ Job failed:`, e); 
      process.exit(1); 
    })
    .finally(async () => { 
      console.log(`[AUTO-CLOSE] Disconnecting from database...`);
      await prisma.$disconnect(); 
      console.log(`[AUTO-CLOSE] Auto-close job finished at ${new Date().toISOString()}`);
    });
}
