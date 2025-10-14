/**
 * @fileoverview src/components/TopNav.tsx
 * Navigation header with role-based menu items and authentication
 */

import { requireUser } from "@/lib/auth/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TopNav() {
    const user = await requireUser(); // if this is used on protected layouts
    const isAdmin = user.role === "admin";
    return (
        <header className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
                    Service Request
                </Link>
                <nav className="flex items-center gap-6">
                    <Link 
                        href="/tickets" 
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        My Tickets
                    </Link>
                    {isAdmin && (
                        <>
                            <Link 
                                href="/admin/dashboard" 
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link 
                                href="/admin/tickets" 
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                All Tickets
                            </Link>
                            <Link 
                                href="/admin/audit" 
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Audit Logs
                            </Link>
                        </>
                    )}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            Signed in as <span className="font-medium text-foreground">{user.username}</span>
                        </span>
                        {/* Security: Server Action sign out then redirect to login */}
                        <form action={async () => {
                            "use server";
                            await auth.api.signOut({ headers: await headers() });
                            redirect("/login");
                        }}>
                            <Button 
                                type="submit" 
                                variant="outline" 
                                size="sm"
                            >
                                Sign out
                            </Button>
                        </form>
                    </div>
                </nav>
            </div>
        </header>
    );
}
