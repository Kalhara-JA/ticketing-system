import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
    try {
        const { identifier } = await req.json();
        if (typeof identifier !== "string" || identifier.trim() === "") {
            return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
        }
        const id = identifier.trim().toLowerCase();
        const isEmail = /\S+@\S+\.\S+/.test(id);
        if (isEmail) return NextResponse.json({ email: id });

        const user = await prisma.user.findFirst({
            where: { username: id },
            select: { email: true },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ email: user.email.toLowerCase() });
    } catch (e) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
