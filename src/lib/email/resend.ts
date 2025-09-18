import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — emails will fail in production.");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Support <onboarding@resend.dev>";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";

if (process.env.NODE_ENV !== "production") {
  console.log("[email] Resend configured", {
    from: EMAIL_FROM,
    hasKey: Boolean(process.env.RESEND_API_KEY),
  });
}
