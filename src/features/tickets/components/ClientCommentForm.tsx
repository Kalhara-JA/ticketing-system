/**
 * @fileoverview src/features/tickets/components/ClientCommentForm.tsx
 * Comment form component with validation and optimistic UI updates
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { CommentInput } from "@/lib/validation/ticketSchemas";
import { addCommentAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function ClientCommentForm({ ticketId }: { ticketId: string }) {
    const router = useRouter();
    const { addToast } = useToast();
    const schema = CommentInput;
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { ticketId, body: "" },
    });
    const [isPending, startTransition] = useTransition();

    const onSubmit = async (data: z.infer<typeof schema>) => {
        try {
            await addCommentAction(data);
            addToast({
                type: "success",
                title: "Comment added",
                message: "Your comment has been successfully added to the ticket."
            });
            reset({ ticketId, body: "" });
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            addToast({
                type: "error",
                title: "Failed to add comment",
                message: e instanceof Error ? e.message : "An unexpected error occurred."
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <textarea {...register("body")} rows={4} className="w-full rounded-md border p-2" placeholder="Write a comment..." />
            {errors.body && <p className="text-sm text-red-600">{errors.body.message}</p>}
            <button className="rounded-md bg-black px-3 py-1 text-white disabled:opacity-50" disabled={isSubmitting || isPending}>
                {isSubmitting ? "Posting…" : "Post comment"}
            </button>
        </form>
    );
}
