/**
 * @fileoverview src/app/(auth)/signup/page.tsx
 * User registration page with email verification flow
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { AuthCard } from "@/components/AuthCard";
import { USERNAME_REGEX } from "@/lib/validation/constants";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const SignUpSchema = z.object({
    email: z.string().email(),
    username: z.string().regex(USERNAME_REGEX, "3–32 chars; letters/numbers . _ -"),
    name: z.string().max(80).optional(),
    password: z.string().min(8).max(128),
    confirm: z.string().min(8).max(128),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

type FormData = z.infer<typeof SignUpSchema>;

export default function SignUpPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const form = useForm<FormData>({
        resolver: zodResolver(SignUpSchema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            // Business logic: sign up with email+password + additional fields
            const res = await authClient.signUp.email({
                email: data.email,
                password: data.password,
                // additional user fields are passed at the top level
                username: data.username,
                name: data.name ?? "",
            });
            if (res.error) {
                addToast({
                    type: "error",
                    title: "Sign up failed",
                    message: res.error.message ?? "Failed to create account"
                });
                return;
            }
            addToast({
                type: "success",
                title: "Account created!",
                message: "Please check your email for a verification link."
            });
            // They'll receive a verification email (per Step 3 config).
            router.push("/login?verified=check-email");
        } catch (e: unknown) {
            addToast({
                type: "error",
                title: "Sign up failed",
                message: e instanceof Error ? e.message : "Something went wrong"
            });
        }
    };

    return (
        <AuthCard title="Create your account">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="Enter your email address" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="Choose a username" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name (optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Create a password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirm"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Confirm your password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />


                    <Button 
                        type="submit" 
                        disabled={form.formState.isSubmitting} 
                        className="w-full"
                    >
                        {form.formState.isSubmitting ? "Creating..." : "Create account"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account? <a className="font-medium text-primary hover:underline" href="/login">Log in</a>
                    </p>
                </form>
            </Form>
        </AuthCard>
    );
}
