import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { presignDownload } from "@/lib/storage/presign";

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

    const url = await presignDownload(
        a.key,
        60, // 1 minute is plenty for a redirect
        {
            "response-content-type": a.contentType,
            "response-content-disposition": `inline; filename="${encodeURIComponent(a.filename)}"`,
            // If you prefer forced download:
            // "response-content-disposition": `attachment; filename="${encodeURIComponent(a.filename)}"`,
        }
    );

    return NextResponse.redirect(url);
}
