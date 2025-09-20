/**
 * @fileoverview src/lib/email/notify.ts
 * Email notification deduplication and generic email sending utilities
 */

import { prisma } from "@/lib/db/prisma";
import { EMAIL_FROM, resend } from "./resend";

/**
 * Prevents duplicate notifications by checking if one was sent in the last minute
 * @param {string} ticketId - Ticket ID for the notification
 * @param {string} eventType - Type of event (e.g., 'comment_added', 'status_changed')
 * @returns {Promise<boolean>} True if notification should be sent, false if duplicate
 */
export async function shouldSendNotification(ticketId: string, eventType: string) {
    const now = new Date();
    const minuteBucket = new Date(now); minuteBucket.setSeconds(0, 0);
    try {
        await prisma.notificationDedup.create({ data: { ticketId, eventType, minuteBucket } });
        return true;
    } catch {
        return false; // already sent within this minute
    }
}

/**
 * Sends a generic email using the Resend service
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML email content
 * @returns {Promise<void>} Resolves when email is sent
 */
export async function sendEmail(to: string, subject: string, html: string) {
    await resend.emails.send({
        from: EMAIL_FROM,
        to, subject, html,
    });
}
