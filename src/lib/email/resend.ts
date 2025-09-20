import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Support <onboarding@resend.dev>";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";

// Lazy initialization to avoid errors during build time when env vars are not available
let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set. Emails will fail in production.");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(target, prop) {
    return getResendClient()[prop as keyof Resend];
  }
});

// Log configuration only if we have the required env vars
if (process.env.NODE_ENV !== "production" && apiKey) {
  console.log("[email] Resend configured", {
    from: EMAIL_FROM,
    hasKey: Boolean(apiKey),
  });
} else if (!apiKey) {
  console.warn("RESEND_API_KEY not set — emails will fail in production.");
}
