/**
 * @fileoverview src/features/tickets/email.ts
 * Ticket-related email notification functions using Resend service
 */

import { resend } from "@/lib/email/resend";
import { EMAIL_FROM, ADMIN_EMAIL } from "@/lib/email/resend";
import {
  renderTicketCreatedEmail,
  renderCommentAddedEmail,
  renderStatusChangedEmail,
  renderReopenedEmail,
} from "@/lib/email/templates";

/**
 * Sends notification email to admin when a new ticket is created
 * @param {Object} opts - Email options
 * @param {string} opts.ticketId - Ticket ID
 * @param {string} opts.title - Ticket title
 * @param {string} opts.userEmail - User's email address
 * @param {string} opts.userUsername - User's username
 * @returns {Promise<void>} Resolves when email is sent
 */
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

/**
 * Sends notification email when a comment is added to a ticket
 * @param {Object} opts - Email options
 * @param {string} opts.ticketId - Ticket ID
 * @param {string} opts.title - Ticket title
 * @param {string} opts.recipientEmail - Recipient email (other party)
 * @param {string} recipientRole - Role of recipient ('admin' or 'user')
 * @returns {Promise<void>} Resolves when email is sent
 */
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

/**
 * Sends notification email when ticket status changes
 * @param {Object} opts - Email options
 * @param {string} opts.ticketId - Ticket ID
 * @param {string} opts.title - Ticket title
 * @param {string} opts.newStatus - New ticket status
 * @param {string} opts.recipientEmail - Requester's email address
 * @returns {Promise<void>} Resolves when email is sent
 */
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

/**
 * Sends notification email to admin when a ticket is reopened
 * @param {Object} opts - Email options
 * @param {string} opts.ticketId - Ticket ID
 * @param {string} opts.title - Ticket title
 * @param {string} opts.adminEmail - Admin email address
 * @returns {Promise<void>} Resolves when email is sent
 */
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
