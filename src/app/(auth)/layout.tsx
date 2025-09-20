/**
 * @fileoverview src/app/(auth)/layout.tsx
 * Authentication layout with session redirect logic
 */

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (session) redirect("/tickets");
    return <div className="mx-auto max-w-xl py-10">{children}</div>;
}