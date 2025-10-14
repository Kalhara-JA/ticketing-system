/**
 * @fileoverview src/features/tickets/components/ClientCommentForm.tsx
 * Comment form component with validation and optimistic UI updates
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { CommentInput } from "@/lib/validation/ticketSchemas";
import { addCommentAction } from "@/features/tickets/actions/userTicket";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

export default function ClientCommentForm({ ticketId }: { ticketId: string }) {
    const router = useRouter();
    const { addToast } = useToast();
    const schema = CommentInput;
    const form = useForm<z.infer<typeof schema>>({
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
            form.reset({ ticketId, body: "" });
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea 
                                    {...field} 
                                    rows={4} 
                                    placeholder="Write a comment..." 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button 
                    type="submit" 
                    disabled={form.formState.isSubmitting || isPending}
                    className="w-full"
                >
                    {form.formState.isSubmitting ? "Posting…" : "Post comment"}
                </Button>
            </form>
        </Form>
    );
}
