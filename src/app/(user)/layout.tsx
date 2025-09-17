import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/login");

    return (
        <div>
            {/* Top nav is role-aware, rendered server-side */}
            <TopNav />
            <div className="min-h-[60vh]">{children}</div>
        </div>
    );
}
