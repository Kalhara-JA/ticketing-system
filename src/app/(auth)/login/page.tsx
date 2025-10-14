/**
 * @fileoverview src/app/(auth)/login/page.tsx
 * User login page with email/username resolution and authentication
 */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { authClient } from "@/lib/auth/client";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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

  const form = useForm<FormData>({
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or Username</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Enter your email or username"
                  />
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
                  <Input 
                    {...field} 
                    type="password" 
                    placeholder="Enter your password"
                  />
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
            {form.formState.isSubmitting ? "Signing in..." : "Continue"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            No account? <a className="font-medium text-primary hover:underline" href="/signup">Create one</a>
          </p>
        </form>
      </Form>
    </AuthCard>
  );
}
