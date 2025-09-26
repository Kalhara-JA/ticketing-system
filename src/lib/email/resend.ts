/**
 * @fileoverview src/lib/email/resend.ts
 * Resend email service configuration with lazy initialization
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/validation/env";

// Lazy initialization to avoid errors during build time when env vars are not available
let _resend: Resend | null = null;
let _env: ReturnType<typeof getEnv> | null = null;

function getEnvConfig() {
  if (!_env) {
    _env = getEnv();
  }
  return _env;
}

export function getEmailFrom() {
  return getEnvConfig().EMAIL_FROM;
}

export function getAdminEmail() {
  return getEnvConfig().ADMIN_EMAIL;
}

/**
 * Gets Resend client instance with lazy initialization
 * @returns {Resend} Configured Resend client
 * @throws {Error} When RESEND_API_KEY is not set
 */
function getResendClient(): Resend {
  if (!_resend) {
    const env = getEnvConfig();
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set. Emails will fail in production.");
    }
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

export const resend = new Proxy({} as Resend, {
  get(target, prop) {
    return getResendClient()[prop as keyof Resend];
  }
});

// Log configuration only if we have the required env vars (lazy check)
setTimeout(() => {
  try {
    const env = getEnvConfig();
    if (!env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not set — emails will fail in production");
    }
  } catch {
    // Ignore errors during build time
  }
}, 0);
