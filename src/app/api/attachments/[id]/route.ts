import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { minio, BUCKET } from "@/lib/storage/minio";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
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
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = a.ticket.userId === session.user.id;
    const isAdmin = session.user.role === "admin";
    if (!(isOwner || isAdmin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Stream the object through the API to avoid exposing presigned URLs
    try {
        const stream = await minio.getObject(BUCKET, a.key);
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

        return new Response(webStream, {
            status: 200,
            headers: new Headers({
                "content-type": a.contentType,
                "content-length": String(a.size),
                "content-disposition": `inline; filename="${encodeURIComponent(a.filename)}"`,
                // To force download instead:
                // "content-disposition": `attachment; filename="${encodeURIComponent(a.filename)}"`,
                "cache-control": "private, no-store",
            }),
        });
    } catch {
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
