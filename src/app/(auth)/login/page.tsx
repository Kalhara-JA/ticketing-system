/**
 * @fileoverview src/app/(auth)/login/page.tsx
 * User login page with email/username resolution and authentication
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { authClient } from "@/lib/auth/client";
import { useToast } from "@/components/Toast";

const LoginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or username"),
  password: z.string().min(8),
});

type FormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { addToast } = useToast();

  // Show verification message on mount if needed
  useEffect(() => {
    if (sp.get("verified")) {
      addToast({
        type: "info",
        title: "Check your email",
        message: "Please check your email for a verification link."
      });
    }
  }, [sp, addToast]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Security: Resolve identifier → email on the server (auth-only helper)
      const r = await fetch("/api/resolve-identifier", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });
      const json = await r.json();
      if (!r.ok) {
        addToast({
          type: "error",
          title: "Login failed",
          message: json?.error ?? "Invalid credentials"
        });
        return;
      }
      const email: string = json.email;

      const res = await authClient.signIn.email({ email, password: data.password });
      if (res.error) {
        addToast({
          type: "error",
          title: "Login failed",
          message: res.error.message ?? "Invalid credentials"
        });
        return;
      }

      addToast({
        type: "success",
        title: "Welcome back!",
        message: "You have been successfully logged in."
      });
      router.push("/tickets"); // user default landing
      router.refresh();
    } catch (e: unknown) {
      addToast({
        type: "error",
        title: "Login failed",
        message: e instanceof Error ? e.message : "Something went wrong"
      });
    }
  };

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Email or Username</label>
          <input 
            {...register("identifier")} 
            className="input" 
            placeholder="Enter your email or username"
          />
          {errors.identifier && <p className="text-sm text-red-600">{errors.identifier.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Password</label>
          <input 
            {...register("password")} 
            type="password" 
            className="input" 
            placeholder="Enter your password"
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <button 
          disabled={isSubmitting} 
          className="btn btn-primary btn-md w-full"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>


        <p className="text-center text-sm text-gray-600">
          No account? <a className="font-medium text-blue-600 hover:underline" href="/signup">Create one</a>
        </p>
      </form>
    </AuthCard>
  );
}
