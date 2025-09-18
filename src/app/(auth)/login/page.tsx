"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { authClient } from "@/lib/auth/client";

const LoginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or username"),
  password: z.string().min(8),
});

type FormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(sp.get("verified") ? "Please check your email for a verification link." : null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      // Resolve identifier → email on the server (auth-only helper)
      const r = await fetch("/api/resolve-identifier", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json?.error ?? "Login failed");
        return;
      }
      const email: string = json.email;

      const res = await authClient.signIn.email({ email, password: data.password });
      if (res.error) {
        setError(res.error.message ?? "Login failed");
        return;
      }

      router.push("/tickets"); // user default landing
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          No account? <a className="font-medium text-blue-600 hover:underline" href="/signup">Create one</a>
        </p>
      </form>
    </AuthCard>
  );
}
