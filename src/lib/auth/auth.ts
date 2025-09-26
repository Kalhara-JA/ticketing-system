/**
 * @fileoverview src/lib/auth/auth.ts
 * Better Auth configuration with email verification and password reset
 */

import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { resend, getEmailFrom } from "@/lib/email/resend";
import { renderAuthEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { prisma } from "../db/prisma";
import { USERNAME_REGEX } from "../validation/constants";
import { getEnv } from "@/lib/validation/env";

const env = getEnv();
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "user", input: false },
      username: { type: "string", required: true, unique: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username = (user.username as string).trim().toLowerCase();
          if (!USERNAME_REGEX.test(username)) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Username must be 3–32 chars (letters, numbers, . _ -) with no spaces.",
            });
          }
          // Enforce role at server-side; ignore any client-provided role
          const role = user.role === "admin" ? "admin" : "user";
          return { data: { ...user, username, role } };
        },
      },
      update: {
        before: async (data) => {
          const next = { ...data };
          if (typeof next.username === "string") {
            next.username = next.username.trim().toLowerCase();
            if (!USERNAME_REGEX.test(next.username as string)) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "Username must be 3–32 chars (letters, numbers, . _ -) with no spaces.",
              });
            }
          }
          // Never allow client-side role escalation
          if (typeof next.role === "string" && next.role !== "user" && next.role !== "admin") {
            next.role = "user";
          }
          return { data: next };
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,      // verify before session
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,

    // Reset password email
    async sendResetPassword({ user, url }) {
      logger.authOperation("reset password email started", user.id, {
        userEmail: user.email,
      });
      
      const html = renderAuthEmail({
        title: "Reset your password",
        intro: `Hi ${user.name ?? "there"},`,
        body: `We received a request to reset your password. If this was you, click the button below.`,
        cta: { label: "Reset Password", url },
        footer: "If you didn't request a reset, you can safely ignore this email.",
      });
      try {
        await resend.emails.send({
          from: getEmailFrom(),
          to: user.email,
          subject: "Reset your password",
          html,
        });
        logger.emailOperation("reset password email sent", user.email, {
          userId: user.id,
        });
      } catch (error) {
        logger.error("Failed to send reset password email", {
          userId: user.id,
          userEmail: user.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      logger.authOperation("verification email started", user.id, {
        userEmail: user.email,
      });
      
      const html = renderAuthEmail({
        title: "Verify your email",
        intro: `Welcome ${user.name ?? ""}!`,
        body: `Please verify your email address to activate your account.`,
        cta: { label: "Verify Email", url },
        footer: "This link will expire soon for security.",
      });
      try {
        await resend.emails.send({
          from: getEmailFrom(),
          to: user.email,
          subject: "Verify your email",
          html,
        });
        logger.emailOperation("verification email sent", user.email, {
          userId: user.id,
        });
      } catch (error) {
        logger.error("Failed to send verification email", {
          userId: user.id,
          userEmail: user.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  },
  plugins: [nextCookies()],
});
