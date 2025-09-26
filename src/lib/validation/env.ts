/**
 * Centralized environment variable validation using Zod.
 * Parses once at startup and provides typed, safe access.
 */
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  AUTO_CLOSE_DAYS: z.string().transform((v) => Number(v)).or(z.number()).default(14),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(24),

  // Email / Resend
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3).default("Support <onboarding@resend.dev>"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),

  // MinIO / S3
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.string().transform((v) => Number(v)).or(z.number()).default(9000),
  MINIO_SSL: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .default(false),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),

  // External (for presigned URLs)
  MINIO_EXTERNAL_ENDPOINT: z.string().optional(),
  MINIO_EXTERNAL_PORT: z.string().transform((v) => Number(v)).or(z.number()).optional(),
  MINIO_EXTERNAL_SSL: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .optional(),
});

let cached: z.infer<typeof EnvSchema> | null = null;

export function getEnv() {
  if (cached) return cached;

  // Build a raw env object, injecting sane defaults when running tests
  const rawEnv: Record<string, unknown> = { ...process.env } as Record<string, unknown>;
  const nodeEnv = (rawEnv.NODE_ENV as string) || "development";
  if (nodeEnv === "test") {
    rawEnv.APP_URL = rawEnv.APP_URL ?? "http://localhost:3000";
    rawEnv.BETTER_AUTH_SECRET = rawEnv.BETTER_AUTH_SECRET ?? "test_secret_key_at_least_24_chars";
    rawEnv.RESEND_API_KEY = rawEnv.RESEND_API_KEY ?? "test_resend_key";
    rawEnv.MINIO_ENDPOINT = rawEnv.MINIO_ENDPOINT ?? "localhost";
    rawEnv.MINIO_PORT = rawEnv.MINIO_PORT ?? 9000;
    rawEnv.MINIO_SSL = rawEnv.MINIO_SSL ?? false;
    rawEnv.MINIO_ACCESS_KEY = rawEnv.MINIO_ACCESS_KEY ?? "minioadmin";
    rawEnv.MINIO_SECRET_KEY = rawEnv.MINIO_SECRET_KEY ?? "minioadmin";
    rawEnv.MINIO_BUCKET = rawEnv.MINIO_BUCKET ?? "ticket-attachments";
  }

  console.log("Validating environment configuration...");

  const parsed = EnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const details = Object.entries(flattened)
      .map(([k, errs]) => `${k}: ${errs?.join(", ")}`)
      .join("; ");
    console.error("❌ Environment validation failed:", details);
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  
  cached = parsed.data;
  console.log(`Environment validated successfully (${cached.NODE_ENV} mode)`);
  return cached;
}

export type Env = ReturnType<typeof getEnv>;


