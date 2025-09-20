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
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Email</label>
                    <input 
                        {...register("email")} 
                        type="email" 
                        className="input" 
                        placeholder="Enter your email address"
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Username</label>
                    <input 
                        {...register("username")} 
                        className="input" 
                        placeholder="Choose a username"
                    />
                    {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Name (optional)</label>
                    <input 
                        {...register("name")} 
                        className="input" 
                        placeholder="Enter your full name"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Password</label>
                    <input 
                        {...register("password")} 
                        type="password" 
                        className="input" 
                        placeholder="Create a password"
                    />
                    {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Confirm password</label>
                    <input 
                        {...register("confirm")} 
                        type="password" 
                        className="input" 
                        placeholder="Confirm your password"
                    />
                    {errors.confirm && <p className="text-sm text-red-600">{errors.confirm.message}</p>}
                </div>


                <button 
                    disabled={isSubmitting} 
                    className="btn btn-primary btn-md w-full"
                >
                    {isSubmitting ? "Creating..." : "Create account"}
                </button>

                <p className="text-center text-sm text-gray-600">
                    Already have an account? <a className="font-medium text-blue-600 hover:underline" href="/login">Log in</a>
                </p>
            </form>
        </AuthCard>
    );
}
