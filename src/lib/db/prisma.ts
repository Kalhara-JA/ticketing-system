/**
 * @fileoverview src/lib/db/prisma.ts
 * Prisma client configuration with global instance for development
 */

import { PrismaClient } from "../../../generated/prisma";

declare global {
    var prisma: PrismaClient | undefined;
}

// Global instance to prevent multiple Prisma clients in development
export const prisma =
    global.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

// Prevent multiple instances in development
if (process.env.NODE_ENV !== "production") global.prisma = prisma;
