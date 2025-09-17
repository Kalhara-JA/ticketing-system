import { requireUser } from "@/lib/auth/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import Link from "next/link";

export default async function TopNav() {
    const user = await requireUser(); // if this is used on protected layouts
    const isAdmin = user.role === "admin";
    return (
        <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold">Service Request</Link>
            <nav className="flex items-center gap-4 text-sm">
                <Link href="/tickets">My Tickets</Link>
                {isAdmin && <Link href="/admin/dashboard">Admin</Link>}
                <span className="opacity-70">Signed in as <strong>{user.username}</strong></span>
                {/* Server Action: sign out then redirect to login */}
                <form action={async () => {
                    "use server";
                    await auth.api.signOut({ headers: await headers() });
                    redirect("/login");
                }}>
                    <button type="submit" className="rounded-md border px-3 py-1">Sign out</button>
                </form>
            </nav>
        </header>
    );
}
