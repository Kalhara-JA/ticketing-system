"use client";

import React from "react";
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-md rounded-2xl border p-6 shadow-sm">
            <h1 className="mb-4 text-xl font-semibold">{title}</h1>
            {children}
        </div>
    );
}
