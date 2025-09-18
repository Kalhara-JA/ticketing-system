"use client";

import React from "react";
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-md">
        <div className="card p-8 shadow-lg">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="mt-2 text-sm text-gray-600">
                    {title === "Log in" ? "Welcome back! Please sign in to your account." : "Create your account to get started."}
                </p>
            </div>
                {children}
            </div>
        </div>
    );
}
