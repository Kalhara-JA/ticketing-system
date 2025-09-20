/**
 * @fileoverview src/lib/auth/session.ts
 * Session management and authorization helpers for Better Auth
 */

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";

export type Session = typeof auth.$Infer.Session; // helper type

/**
 * Retrieves the current user session
 * @returns {Promise<Session | null>} User session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
    return auth.api.getSession({ headers: await headers() });
}

/**
 * Requires an authenticated user, throwing if not logged in
 * @returns {Promise<User>} Authenticated user
 * @throws {Error} When user is not authenticated
 */
export async function requireUser() {
    const session = await getSession();
    if (!session) {
        logger.error("Unauthorized access attempt - no session", {
            endpoint: "requireUser",
        });
        throw new Error("Unauthorized");
    }
    return session.user;
}

/**
 * Requires an admin user, throwing if not admin
 * @returns {Promise<User>} Admin user
 * @throws {Error} When user is not authenticated or not admin
 */
export async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "admin") {
        logger.error("Unauthorized admin access attempt", {
            userId: user.id,
            userRole: user.role,
            endpoint: "requireAdmin",
        });
        throw new Error("Forbidden");
    }
    return user;
}
