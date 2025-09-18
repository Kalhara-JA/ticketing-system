import { resend } from "@/lib/email/resend";
import { EMAIL_FROM, ADMIN_EMAIL } from "@/lib/email/resend";

export async function sendTicketCreatedEmail(opts: {
    ticketId: string;
    title: string;
    userEmail: string;
    userUsername: string;
}) {
    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const adminLink = `${base}/admin/tickets/${opts.ticketId}`;

    const html = `<!doctype html><html><body style="font-family:system-ui">
    <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
      <h2 style="margin:0 0 12px">New Ticket</h2>
      <p><strong>Title:</strong> ${escapeHtml(opts.title)}</p>
      <p><strong>From:</strong> ${escapeHtml(opts.userUsername)} (${escapeHtml(opts.userEmail)})</p>
      <p><a href="${adminLink}">Open in Admin</a></p>
    </div>
  </body></html>`;

    await resend.emails.send({
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: `New ticket: ${opts.title}`,
        html,
    });
}

export async function sendCommentAddedEmail(opts: {
    ticketId: string;
    title: string;
    recipientEmail: string; // "other party"
}) {
    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const link = `${base}/tickets/${opts.ticketId}`;
    const html = `<!doctype html><html><body style="font-family:system-ui">
      <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 12px">New Comment</h2>
        <p>A new comment was added on ticket: <strong>${escapeHtml(opts.title)}</strong></p>
        <p><a href="${link}">Open Ticket</a></p>
      </div>
    </body></html>`;
    await resend.emails.send({
        from: EMAIL_FROM,
        to: opts.recipientEmail,
        subject: `New comment on: ${opts.title}`,
        html,
    });
}

export async function sendStatusChangedEmail(opts: {
    ticketId: string;
    title: string;
    newStatus: string;
    recipientEmail: string; // requester
}) {
    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const link = `${base}/tickets/${opts.ticketId}`;
    const html = `<!doctype html><html><body style="font-family:system-ui">
      <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 12px">Ticket status updated</h2>
        <p><strong>${escapeHtml(opts.title)}</strong> is now <strong>${escapeHtml(opts.newStatus)}</strong>.</p>
        <p><a href="${link}">Open Ticket</a></p>
      </div>
    </body></html>`;
    await resend.emails.send({
        from: EMAIL_FROM,
        to: opts.recipientEmail,
        subject: `Status changed: ${opts.title} → ${opts.newStatus}`,
        html,
    });
}

export async function sendReopenedEmail(opts: {
    ticketId: string;
    title: string;
    adminEmail: string;
}) {
    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const link = `${base}/admin/tickets/${opts.ticketId}`;
    const html = `<!doctype html><html><body style="font-family:system-ui">
      <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 12px">Ticket reopened</h2>
        <p>The requester reopened <strong>${escapeHtml(opts.title)}</strong>.</p>
        <p><a href="${link}">Open in Admin</a></p>
      </div>
    </body></html>`;
    await resend.emails.send({
        from: EMAIL_FROM,
        to: opts.adminEmail,
        subject: `Reopened: ${opts.title}`,
        html,
    });
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}
