/**
 * @fileoverview src/lib/email/resend.ts
 * Resend email service configuration with lazy initialization
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/validation/env";

const env = getEnv();
const apiKey = env.RESEND_API_KEY;
export const EMAIL_FROM = env.EMAIL_FROM;
export const ADMIN_EMAIL = env.ADMIN_EMAIL;

// Lazy initialization to avoid errors during build time when env vars are not available
let _resend: Resend | null = null;

/**
 * Gets Resend client instance with lazy initialization
 * @returns {Resend} Configured Resend client
 * @throws {Error} When RESEND_API_KEY is not set
 */
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
if (!apiKey) {
  logger.warn("RESEND_API_KEY not set — emails will fail in production");
}
