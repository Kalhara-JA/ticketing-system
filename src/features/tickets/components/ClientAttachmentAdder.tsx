/**
 * @fileoverview src/features/tickets/components/ClientAttachmentAdder.tsx
 * File upload component with validation, presigned URLs, and progress tracking
 */

"use client";

import { useState, useTransition } from "react";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES } from "@/lib/validation/constants";
import { AttachmentMeta } from "@/lib/validation/ticketSchemas";
import { validateFileContent } from "@/lib/validation/fileValidation";
import { z } from "zod";
import { addAttachmentsAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function ClientAttachmentAdder({ ticketId }: { ticketId: string }) {
    const [uploading, setUploading] = useState(false);
    const [, startTransition] = useTransition();
    const router = useRouter();
    const { addToast } = useToast();

    const onFilesPicked = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);

        try {
            // Business logic: File validation, presigned URL generation, and upload
            const metas: z.infer<typeof AttachmentMeta>[] = [];
            for (const f of Array.from(files)) {
                // Security: Validate file type and size before upload
                if (!ATTACHMENT_ALLOWED_TYPES.includes(f.type as "application/pdf" | "image/png" | "image/jpeg")) { 
                    addToast({
                        type: "error",
                        title: "Unsupported file type",
                        message: `${f.name} (${f.type}). Please use PDF, PNG, or JPEG files.`
                    });
                    continue; 
                }
                if (f.size > ATTACHMENT_MAX_BYTES) { 
                    addToast({
                        type: "error",
                        title: "File too large",
                        message: `${f.name} exceeds the maximum size of ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)}MB.`
                    });
                    continue; 
                }

                // Security: Validate file content matches declared MIME type
                const contentValidation = await validateFileContent(f, f.type);
                if (!contentValidation.valid) {
                    addToast({
                        type: "error",
                        title: "Invalid file content",
                        message: contentValidation.error || `File content does not match declared type for ${f.name}.`
                    });
                    continue;
                }

                // Security: Get presigned URL for secure upload
                const r = await fetch("/api/attachments/presign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
                });
                const json = await r.json();
                if (!r.ok) { 
                    addToast({
                        type: "error",
                        title: "Upload preparation failed",
                        message: `Failed to prepare upload for ${f.name}: ${json?.error ?? "Unknown error"}`
                    });
                    continue; 
                }

                // Upload file to MinIO using presigned URL
                const put = await fetch(json.url, { method: "PUT", headers: { "content-type": f.type }, body: f });
                if (!put.ok) { 
                    addToast({
                        type: "error",
                        title: "Upload failed",
                        message: `Failed to upload ${f.name}. Please try again.`
                    });
                    continue; 
                }

                metas.push({ name: f.name, key: json.key, size: f.size, contentType: f.type as "application/pdf" | "image/png" | "image/jpeg" });
            }
            if (metas.length) {
                try {
                    await addAttachmentsAction(ticketId, metas);
                    addToast({
                        type: "success",
                        title: "Attachments added",
                        message: `Successfully added ${metas.length} attachment${metas.length === 1 ? '' : 's'} to the ticket.`
                    });
                    startTransition(() => router.refresh());
                } catch (e: unknown) {
                    addToast({
                        type: "error",
                        title: "Failed to add attachments",
                        message: e instanceof Error ? e.message : "An unexpected error occurred."
                    });
                }
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="attachments">Add attachments</Label>
            <div className="flex items-center gap-2">
                <input 
                    id="attachments"
                    type="file" 
                    multiple 
                    onChange={(e) => onFilesPicked(e.currentTarget.files)}
                    disabled={uploading}
                    className="hidden"
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('attachments')?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                >
                    <Upload className="h-4 w-4" />
                    Choose Files
                </Button>
                {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
            </div>
        </div>
    );
}
