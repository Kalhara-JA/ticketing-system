import { requireUser } from "@/lib/auth/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import Link from "next/link";

export default async function TopNav() {
    const user = await requireUser(); // if this is used on protected layouts
    const isAdmin = user.role === "admin";
    return (
        <header className="border-b border-gray-300 bg-white">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                    Service Request
                </Link>
                <nav className="flex items-center gap-6">
                    <Link 
                        href="/tickets" 
                        className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        My Tickets
                    </Link>
                    {isAdmin && (
                        <>
                            <Link 
                                href="/admin/dashboard" 
                                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link 
                                href="/admin/tickets" 
                                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                All Tickets
                            </Link>
                            <Link 
                                href="/admin/audit" 
                                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Audit Logs
                            </Link>
                        </>
                    )}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-700">
                            Signed in as <span className="font-medium text-gray-900">{user.username}</span>
                        </span>
                        {/* Server Action: sign out then redirect to login */}
                        <form action={async () => {
                            "use server";
                            await auth.api.signOut({ headers: await headers() });
                            redirect("/login");
                        }}>
                            <button 
                                type="submit" 
                                className="btn btn-outline btn-sm"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </nav>
            </div>
        </header>
    );
}
