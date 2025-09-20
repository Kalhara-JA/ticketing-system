/**
 * @fileoverview src/app/error.tsx
 * Global error boundary component with error logging and recovery
 */

"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
    console.error(error);
    return (
        <html>
            <body className="mx-auto max-w-xl p-6">
                <h1 className="text-xl font-semibold">Something went wrong</h1>
                <p className="mt-2 opacity-80 text-sm">We’ve logged the error. You can try again.</p>
                <button onClick={reset} className="mt-4 rounded-md border px-3 py-1">Try again</button>
            </body>
        </html>
    );
}
