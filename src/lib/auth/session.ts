import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export type Session = typeof auth.$Infer.Session; // helper type

export async function getSession(): Promise<Session | null> {
    return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    return session.user;
}

export async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "admin") throw new Error("Forbidden");
    return user;
}
