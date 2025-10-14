/**
 * @fileoverview src/components/AuthCard.tsx
 * Reusable authentication card component with dynamic messaging
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-md">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                    <CardDescription>
                        {title === "Log in" ? "Welcome back! Please sign in to your account." : "Create your account to get started."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}
