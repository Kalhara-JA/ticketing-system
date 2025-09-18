"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { CommentInput } from "@/lib/validation/ticketSchemas";
import { addCommentAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";

export default function ClientCommentForm({ ticketId }: { ticketId: string }) {
    const router = useRouter();
    const schema = CommentInput;
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { ticketId, body: "" },
    });
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const onSubmit = async (data: z.infer<typeof schema>) => {
        setError(null);
        try {
            await addCommentAction(data);
            reset({ ticketId, body: "" });
            startTransition(() => router.refresh());
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to add comment");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <textarea {...register("body")} rows={4} className="w-full rounded-md border p-2" placeholder="Write a comment..." />
            {errors.body && <p className="text-sm text-red-600">{errors.body.message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="rounded-md bg-black px-3 py-1 text-white disabled:opacity-50" disabled={isSubmitting || isPending}>
                {isSubmitting ? "Posting…" : "Post comment"}
            </button>
        </form>
    );
}
