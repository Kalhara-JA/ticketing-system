"use client";

import { useState, useTransition } from "react";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES } from "@/lib/validation/constants";
import { AttachmentMeta } from "@/lib/validation/ticketSchemas";
import { z } from "zod";
import { addAttachmentsAction } from "../../../app/(user)/tickets/[id]/actions";
import { useRouter } from "next/navigation";

export default function ClientAttachmentAdder({ ticketId }: { ticketId: string }) {
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [, startTransition] = useTransition();
    const router = useRouter();

    const onFilesPicked = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);
        setUploading(true);

        try {
            const metas: z.infer<typeof AttachmentMeta>[] = [];
            for (const f of Array.from(files)) {
                if (!ATTACHMENT_ALLOWED_TYPES.includes(f.type as "application/pdf" | "image/png" | "image/jpeg")) { setError(`Unsupported: ${f.type}`); continue; }
                if (f.size > ATTACHMENT_MAX_BYTES) { setError(`Too big: ${f.name}`); continue; }

                const r = await fetch("/api/attachments/presign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
                });
                const json = await r.json();
                if (!r.ok) { setError(json?.error ?? "Presign failed"); continue; }

                const put = await fetch(json.url, { method: "PUT", headers: { "content-type": f.type }, body: f });
                if (!put.ok) { setError(`Upload failed: ${f.name}`); continue; }

                metas.push({ name: f.name, key: json.key, size: f.size, contentType: f.type as "application/pdf" | "image/png" | "image/jpeg" });
            }
            if (metas.length) {
                await addAttachmentsAction(ticketId, metas);
                startTransition(() => router.refresh());
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium">Add attachments</label>
            <input type="file" multiple onChange={(e) => onFilesPicked(e.currentTarget.files)} />
            {uploading && <p className="text-sm">Uploading…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
