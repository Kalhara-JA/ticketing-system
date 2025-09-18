import { resend } from "@/lib/email/resend";
import { EMAIL_FROM, ADMIN_EMAIL } from "@/lib/email/resend";
import {
  renderTicketCreatedEmail,
  renderCommentAddedEmail,
  renderStatusChangedEmail,
  renderReopenedEmail,
} from "@/lib/email/templates";

export async function sendTicketCreatedEmail(opts: {
    ticketId: string;
    title: string;
    userEmail: string;
    userUsername: string;
}) {
    const html = renderTicketCreatedEmail(opts);

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
}, recipientRole: "admin" | "user") {
    const html = renderCommentAddedEmail({ ...opts, recipientRole });
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
    const html = renderStatusChangedEmail(opts);
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
    const html = renderReopenedEmail(opts);
    await resend.emails.send({
        from: EMAIL_FROM,
        to: opts.adminEmail,
        subject: `Reopened: ${opts.title}`,
        html,
    });
}

// Escape handled inside templates
