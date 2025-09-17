"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { AuthCard } from "@/components/AuthCard";
import { USERNAME_REGEX } from "@/lib/validation/constants";

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
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(SignUpSchema),
    });

    const onSubmit = async (data: FormData) => {
        setError(null);
        try {
            // Better Auth: sign up with email+password + additional fields
            const res = await authClient.signUp.email({
                email: data.email,
                password: data.password,
                // additional user fields are passed at the top level
                username: data.username,
                name: data.name ?? "",
            });
            if (res.error) {
                setError(res.error.message ?? "Sign up failed");
                return;
            }
            // They’ll receive a verification email (per Step 3 config).
            router.push("/login?verified=check-email");
        } catch (e: any) {
            setError(e?.message ?? "Something went wrong");
        }
    };

    return (
        <AuthCard title="Create your account">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input {...register("email")} type="email" className="mt-1 w-full rounded-md border p-2" />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Username</label>
                    <input {...register("username")} className="mt-1 w-full rounded-md border p-2" />
                    {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Name (optional)</label>
                    <input {...register("name")} className="mt-1 w-full rounded-md border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Password</label>
                    <input {...register("password")} type="password" className="mt-1 w-full rounded-md border p-2" />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Confirm password</label>
                    <input {...register("confirm")} type="password" className="mt-1 w-full rounded-md border p-2" />
                    {errors.confirm && <p className="mt-1 text-sm text-red-600">{errors.confirm.message}</p>}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button disabled={isSubmitting} className="w-full rounded-md bg-black p-2 text-white disabled:opacity-50">
                    {isSubmitting ? "Creating..." : "Create account"}
                </button>

                <p className="pt-2 text-center text-sm opacity-80">
                    Already have an account? <a className="underline" href="/login">Log in</a>
                </p>
            </form>
        </AuthCard>
    );
}
