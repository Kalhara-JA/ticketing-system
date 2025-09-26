/**
 * @fileoverview src/lib/db/prisma.ts
 * Prisma client configuration with global instance for development
 */

import { PrismaClient } from "../../../generated/prisma";
import { getEnv } from "@/lib/validation/env";

declare global {
    var prisma: PrismaClient | undefined;
}

// Global instance to prevent multiple Prisma clients in development
const env = getEnv();
export const prisma =
    global.prisma ??
    new PrismaClient({
        log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

// Prevent multiple instances in development
if (env.NODE_ENV !== "production") global.prisma = prisma;
