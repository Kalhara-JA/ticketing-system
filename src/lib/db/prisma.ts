/**
 * @fileoverview src/lib/db/prisma.ts
 * Prisma client configuration with global instance for development
 */

import { PrismaClient } from "../../../generated/prisma";
import { getEnv } from "@/lib/validation/env";

declare global {
    var prisma: PrismaClient | undefined;
}

// Lazy initialization to avoid environment validation during build time
let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
    get(target, prop) {
        if (!_prisma) {
            const env = getEnv();
            _prisma = global.prisma ?? new PrismaClient({
                log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
            });
            
            // Prevent multiple instances in development
            if (env.NODE_ENV !== "production") global.prisma = _prisma;
        }
        return _prisma[prop as keyof PrismaClient];
    }
});
