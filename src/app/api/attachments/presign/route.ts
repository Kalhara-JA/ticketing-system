/**
 * @fileoverview src/app/api/attachments/presign/route.ts
 * API route for generating presigned URLs for file uploads
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { presignUpload } from "@/lib/storage/presign";
import { getSession } from "@/lib/auth/session";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES } from "@/lib/validation/constants";
import { logger } from "@/lib/logger";
import { sanitizeFilename } from "@/lib/validation/sanitize";

/**
 * Generates a presigned URL for secure file upload to MinIO storage
 * @param {Request} req - HTTP request containing file metadata
 * @returns {Promise<NextResponse>} JSON response with presigned URL and storage key
 * @throws {Error} When authentication fails or file validation fails
 */
export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        logger.error("Unauthorized presign request", {
            endpoint: "/api/attachments/presign",
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { filename, contentType, size } = await req.json().catch(() => ({}));

        // Validate file metadata
        if (typeof filename !== "string" || !filename.trim()) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }
        if (!ATTACHMENT_ALLOWED_TYPES.includes(contentType)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }
        if (typeof size !== "number" || size <= 0 || size > ATTACHMENT_MAX_BYTES) {
            return NextResponse.json({ error: "File too large" }, { status: 400 });
        }

        // Sanitize filename and map extension from MIME type (avoid trusting provided extension)
        const safeProvided = sanitizeFilename(filename);
        const mimeToExt: Record<typeof ATTACHMENT_ALLOWED_TYPES[number], string> = {
            "application/pdf": "pdf",
            "image/png": "png",
            "image/jpeg": "jpg",
        };
        const ext = mimeToExt[contentType as typeof ATTACHMENT_ALLOWED_TYPES[number]] ?? (safeProvided.includes(".") ? safeProvided.split(".").pop()! : "bin");

        // Generate secure storage key with user isolation
        const key = `u/${session.user.id}/incoming/${randomUUID()}.${ext}`;
        
        // Create presigned URL with 15-minute expiry
        const url = await presignUpload(key, 15 * 60);

        return NextResponse.json({ url, key, filename: safeProvided });
    } catch (error) {
        logger.error("Presign request failed", {
            userId: session.user.id,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
