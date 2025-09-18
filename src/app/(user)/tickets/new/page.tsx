"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateTicketInput, AttachmentMeta } from "@/lib/validation/ticketSchemas";
import { createTicketAction } from "./actions";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "@/lib/validation/constants";

type FormData = z.infer<typeof CreateTicketInput>;

export default function NewTicketPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploads, setUploads] = useState<z.infer<typeof AttachmentMeta>[]>([]);

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(CreateTicketInput),
        defaultValues: { title: "", body: "", attachments: [] },
        mode: "onChange",
    });

    // Handle file selection -> presign -> upload -> collect meta
    const onFilesPicked = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);

        const curr = uploads.length;
        if (curr + files.length > ATTACHMENT_MAX_COUNT) {
            setError(`You can attach up to ${ATTACHMENT_MAX_COUNT} files.`);
            return;
        }

        setUploading(true);
        try {
            const newMetas: z.infer<typeof AttachmentMeta>[] = [];
            for (const f of Array.from(files)) {
                if (!ATTACHMENT_ALLOWED_TYPES.includes(f.type as "application/pdf" | "image/png" | "image/jpeg")) {
                    setError(`Unsupported type: ${f.type}`);
                    continue;
                }
                if (f.size > ATTACHMENT_MAX_BYTES) {
                    setError(`File too large: ${f.name}`);
                    continue;
                }

                const r = await fetch("/api/attachments/presign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
                });
                const json = await r.json();
                if (!r.ok) { setError(json?.error ?? "Failed to prepare upload"); continue; }

                const put = await fetch(json.url, { method: "PUT", headers: { "content-type": f.type }, body: f });
                if (!put.ok) { setError(`Upload failed: ${f.name}`); continue; }

                newMetas.push({ name: f.name, key: json.key, size: f.size, contentType: f.type as "application/pdf" | "image/png" | "image/jpeg" });
            }

            const next = [...uploads, ...newMetas];
            setUploads(next);
            setValue("attachments", next, { shouldValidate: true, shouldDirty: true });
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        setError(null);
        try {
            const res = await createTicketAction({
                title: data.title,
                body: data.body,
                attachments: uploads,
            });
            // Minimal success: route to placeholder detail page
            router.push(`/tickets/${res.id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create ticket");
        }
    };

    const attachments = watch("attachments") || [];

    return (
        <div className="container mx-auto max-w-2xl space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Create New Ticket</h1>
                <p className="text-muted-foreground">Submit a new service request</p>
            </div>

            <div className="card p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Title</label>
                        <input 
                            {...register("title")} 
                            className="input" 
                            placeholder="Brief description of your request"
                        />
                        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea 
                            {...register("body")} 
                            rows={6} 
                            className="input resize-none" 
                            placeholder="Provide detailed information about your request..."
                        />
                        {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Attachments
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Supported formats: PDF, PNG, JPG. Maximum {ATTACHMENT_MAX_COUNT} files, {Math.floor(ATTACHMENT_MAX_BYTES / 1024 / 1024)}MB each.
                        </p>
                        <input 
                            type="file" 
                            multiple 
                            onChange={(e) => onFilesPicked(e.currentTarget.files)} 
                            className="input file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80" 
                        />
                        {uploading && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                Uploading files...
                            </div>
                        )}
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-900">Attached files:</p>
                                <ul className="space-y-1">
                                    {attachments.map((a, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                            {a.name} ({(a.size / 1024 / 1024).toFixed(1)}MB)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            disabled={isSubmitting || uploading}
                            className="btn btn-primary btn-md flex-1"
                        >
                            {isSubmitting ? "Creating..." : "Create Ticket"}
                        </button>
                        <Link 
                            href="/tickets" 
                            className="btn btn-outline btn-md"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
