/**
 * @fileoverview src/lib/email/templates.tsx
 * React email template components for authentication and ticket notifications
 */

/**
 * Renders a generic authentication email template
 * @param {Object} opts - Email template options
 * @param {string} opts.title - Email title
 * @param {string} opts.intro - Optional introduction text
 * @param {string} opts.body - Optional body text
 * @param {Object} opts.cta - Optional call-to-action button
 * @param {string} opts.footer - Optional footer text
 * @returns {string} HTML email content
 */
export function renderAuthEmail(opts: {
    title: string;
    intro?: string;
    body?: string;
    cta?: { label: string; url: string };
    footer?: string;
}) {
    const { title, intro, body, cta, footer } = opts;
    return /* html */ `<!doctype html>
  <html>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
      <div style="max-width:560px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
        ${intro ? `<p>${escapeHtml(intro)}</p>` : ""}
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        ${cta
            ? `<p style="margin:24px 0">
                 <a href="${cta.url}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
                   ${escapeHtml(cta.label)}
                 </a>
               </p>`
            : ""
        }
        ${footer ? `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>` : ""}
      </div>
    </body>
  </html>`;
}

// Common base wrapper for ticket-related emails
function renderTicketShell(title: string, contentHtml: string) {
  return `<!doctype html>
  <html>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
      <div style="max-width:560px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
        ${contentHtml}
      </div>
    </body>
  </html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0">
    <a href="${href}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none">${escapeHtml(label)}</a>
  </p>`;
}

import { getEnv } from "@/lib/validation/env";
function appBaseUrl() {
  const env = getEnv();
  return env.APP_URL.replace(/\/$/, "");
}

export function renderTicketCreatedEmail(opts: {
  ticketId: string;
  title: string;
  userEmail: string;
  userUsername: string;
}) {
  const adminLink = `${appBaseUrl()}/admin/tickets/${opts.ticketId}`;
  const html = `
    <p><strong>Title:</strong> ${escapeHtml(opts.title)}</p>
    <p><strong>From:</strong> ${escapeHtml(opts.userUsername)} (${escapeHtml(opts.userEmail)})</p>
    ${button(adminLink, "Open in Admin")}
  `;
  return renderTicketShell("New Ticket", html);
}

export function renderCommentAddedEmail(opts: {
  ticketId: string;
  title: string;
  recipientRole: "admin" | "user";
}) {
  const link = opts.recipientRole === "admin"
    ? `${appBaseUrl()}/admin/tickets/${opts.ticketId}`
    : `${appBaseUrl()}/tickets/${opts.ticketId}`;
  const html = `
    <p>A new comment was added on ticket: <strong>${escapeHtml(opts.title)}</strong></p>
    ${button(link, "Open Ticket")}
  `;
  return renderTicketShell("New Comment", html);
}

export function renderStatusChangedEmail(opts: {
  ticketId: string;
  title: string;
  newStatus: string;
}) {
  const link = `${appBaseUrl()}/tickets/${opts.ticketId}`;
  const html = `
    <p><strong>${escapeHtml(opts.title)}</strong> is now <strong>${escapeHtml(opts.newStatus)}</strong>.</p>
    ${button(link, "Open Ticket")}
  `;
  return renderTicketShell("Ticket status updated", html);
}

export function renderReopenedEmail(opts: {
  ticketId: string;
  title: string;
}) {
  const link = `${appBaseUrl()}/admin/tickets/${opts.ticketId}`;
  const html = `
    <p>The requester reopened <strong>${escapeHtml(opts.title)}</strong>.</p>
    ${button(link, "Open in Admin")}
  `;
  return renderTicketShell("Ticket reopened", html);
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}
