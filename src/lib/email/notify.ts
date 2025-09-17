// src/lib/email/notify.ts
import { prisma } from "@/lib/db/prisma";
import { resend } from "./resend";

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

export async function sendEmail(to: string, subject: string, html: string) {
    await resend.emails.send({
        from: "Support <no-reply@" + new URL(process.env.APP_URL!).hostname + ">",
        to, subject, html,
    });
}
