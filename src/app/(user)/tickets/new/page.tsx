/**
 * @fileoverview src/app/(user)/tickets/new/page.tsx
 * New ticket creation page with file upload and validation
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateTicketInput, AttachmentMeta } from "@/lib/validation/ticketSchemas";
import { validateFileContent } from "@/lib/validation/fileValidation";
import { createTicketAction } from "@/features/tickets/actions/createTicket";
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "@/lib/validation/constants";
import { useToast } from "@/components/Toast";

type FormData = z.infer<typeof CreateTicketInput>;

export default function NewTicketPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(CreateTicketInput),
        defaultValues: { title: "", body: "", attachments: [] },
        mode: "onChange",
    });

    // Business logic: File validation and selection (upload happens on form submission)
    const onFilesPicked = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        // Security: Enforce attachment count limit
        const curr = selectedFiles.length;
        if (curr + files.length > ATTACHMENT_MAX_COUNT) {
            addToast({
                type: "error",
                title: "Too many files",
                message: `You can attach up to ${ATTACHMENT_MAX_COUNT} files.`
            });
            return;
        }

        const validFiles: File[] = [];
        for (const f of Array.from(files)) {
            // Security: Validate file type and size
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

            validFiles.push(f);
        }

        if (validFiles.length > 0) {
            const next = [...selectedFiles, ...validFiles];
            setSelectedFiles(next);
            addToast({
                type: "success",
                title: "Files selected",
                message: `${validFiles.length} file${validFiles.length === 1 ? '' : 's'} selected for upload.`
            });
        }
    };

    const onSubmit = async (data: FormData) => {
        setUploading(true);
        try {
            // Upload files first if any are selected
            const attachmentMetas: z.infer<typeof AttachmentMeta>[] = [];
            if (selectedFiles.length > 0) {
                for (const f of selectedFiles) {
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

                    attachmentMetas.push({ name: f.name, key: json.key, size: f.size, contentType: f.type as "application/pdf" | "image/png" | "image/jpeg" });
                }
            }

            // Create ticket with uploaded attachments
            const res = await createTicketAction({
                title: data.title,
                body: data.body,
                attachments: attachmentMetas,
            });
            addToast({
                type: "success",
                title: "Ticket created",
                message: "Your ticket has been successfully created and submitted."
            });
            // Minimal success: route to placeholder detail page
            router.push(`/tickets/${res.id}`);
        } catch (e: unknown) {
            addToast({
                type: "error",
                title: "Failed to create ticket",
                message: e instanceof Error ? e.message : "An unexpected error occurred."
            });
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (index: number) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
    };

    return (
        <div className="container mx-auto space-y-6 p-6">
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
                        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea 
                            {...register("body")} 
                            rows={6} 
                            className="input resize-none" 
                            placeholder="Provide detailed information about your request..."
                        />
                        {errors.body && <p className="text-sm text-red-600">{errors.body.message}</p>}
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
                            disabled={uploading || isSubmitting}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                        {uploading && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                Uploading files...
                            </div>
                        )}
                        {selectedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-sm font-medium text-foreground">Selected files:</p>
                                <div className="space-y-2">
                                    {selectedFiles.map((file, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(i)}
                                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                title="Remove file"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            disabled={isSubmitting || uploading}
                            className="btn btn-primary btn-md flex-1"
                        >
                            {uploading ? "Uploading files..." : isSubmitting ? "Creating..." : "Create Ticket"}
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
