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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    }
  };

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Email or Username</label>
          <input {...register("identifier")} className="mt-1 w-full rounded-md border p-2" />
          {errors.identifier && <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input {...register("password")} type="password" className="mt-1 w-full rounded-md border p-2" />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <button disabled={isSubmitting} className="w-full rounded-md bg-black p-2 text-white disabled:opacity-50">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        {error && <p className="pt-2 text-sm text-red-600">{error}</p>}

        <p className="pt-2 text-center text-sm opacity-80">
          No account? <a className="underline" href="/signup">Create one</a>
        </p>
      </form>
    </AuthCard>
  );
}
