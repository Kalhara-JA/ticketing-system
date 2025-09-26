/**
 * @fileoverview src/app/api/attachments/[id]/route.ts
 * API route for secure attachment downloads with authorization
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { minio, getBucket } from "@/lib/storage/minio";
import { logger } from "@/lib/logger";

/**
 * Streams attachment file from MinIO storage with proper authorization
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters containing attachment ID
 * @returns {Promise<Response>} File stream or error response
 * @throws {Error} When user lacks permission or file not found
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        logger.error("Unauthorized attachment download request", {
            endpoint: "/api/attachments/[id]",
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;

    // Fetch attachment with ticket ownership info for authorization
    const a = await prisma.attachment.findUnique({
        where: { id: resolvedParams.id },
        select: {
            id: true,
            filename: true,
            key: true,
            contentType: true,
            size: true,
            ticket: { select: { userId: true } },
            uploadedById: true,
        },
    });
    if (!a) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Authorization: Only ticket owner or admin can download
    const isOwner = a.ticket.userId === session.user.id;
    const isAdmin = session.user.role === "admin";
    if (!(isOwner || isAdmin)) {
        logger.error("Unauthorized attachment download attempt", {
            userId: session.user.id,
            userRole: session.user.role,
            attachmentId: resolvedParams.id,
            ticketOwnerId: a.ticket.userId,
            attachmentUploaderId: a.uploadedById,
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Stream the object through the API to avoid exposing presigned URLs
    try {
        const stream = await minio.getObject(getBucket(), a.key);

        // Convert Node stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
                stream.on("end", () => controller.close());
                stream.on("error", (err: unknown) => controller.error(err));
            },
            cancel() {
                stream.destroy();
            },
        });

        // Use attachment disposition with a sanitized filename to avoid header injection
        const safeName = encodeURIComponent(a.filename.replace(/\r|\n|"/g, ""));
        return new Response(webStream, {
            status: 200,
            headers: new Headers({
                "content-type": a.contentType,
                "content-length": String(a.size),
                "content-disposition": `attachment; filename*=UTF-8''${safeName}`,
                // To force download instead:
                // "content-disposition": `attachment; filename="${encodeURIComponent(a.filename)}"`,
                "cache-control": "private, no-store",
            }),
        });
    } catch (error) {
        logger.error("Attachment download failed", {
            userId: session.user.id,
            attachmentId: resolvedParams.id,
            filename: a.filename,
            key: a.key,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
