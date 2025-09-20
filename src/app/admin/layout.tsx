/**
 * @fileoverview src/app/admin/layout.tsx
 * Admin layout with role-based access control and navigation
 */

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/login");
    // Security: Admin-only access control
    if (session.user.role !== "admin") redirect("/tickets"); // or a 403 page

    return (
        <div>
            <TopNav />
            <div className="min-h-[60vh]">{children}</div>
        </div>
    );
}
