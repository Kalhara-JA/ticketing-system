/**
 * @fileoverview src/app/api/resolve-identifier/route.ts
 * API route for resolving usernames to email addresses for authentication
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

/**
 * Resolves a username or email to an email address for authentication
 * @param {Request} req - HTTP request containing identifier
 * @returns {Promise<NextResponse>} JSON response with email or error
 * @throws {Error} When identifier resolution fails
 */
export async function POST(req: Request) {
    try {
        const { identifier } = await req.json();

        if (typeof identifier !== "string" || identifier.trim() === "") {
            return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
        }
        
        const id = identifier.trim().toLowerCase();
        const isEmail = /\S+@\S+\.\S+/.test(id);
        
        // If it's already an email, return it directly
        if (isEmail) {
            return NextResponse.json({ email: id });
        }

        // Look up username in database
        const user = await prisma.user.findFirst({
            where: { username: id },
            select: { email: true },
        });
        
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        return NextResponse.json({ email: user.email.toLowerCase() });
    } catch (error) {
        logger.error("Identifier resolution failed", {
            error: error instanceof Error ? error.message : "Unknown error",
            endpoint: "/api/resolve-identifier",
        });
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
