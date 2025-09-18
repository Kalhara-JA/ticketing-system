import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { presignUpload } from "@/lib/storage/presign";
import { getSession } from "@/lib/auth/session";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES } from "@/lib/validation/constants";

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename, contentType, size } = await req.json().catch(() => ({}));
    if (typeof filename !== "string" || !filename.trim()) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }
    if (!ATTACHMENT_ALLOWED_TYPES.includes(contentType)) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (typeof size !== "number" || size <= 0 || size > ATTACHMENT_MAX_BYTES) {
        return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
    const key = `u/${session.user.id}/incoming/${randomUUID()}.${ext}`;
    const url = await presignUpload(key, 15 * 60); // 15 minutes
    return NextResponse.json({ url, key });
}
