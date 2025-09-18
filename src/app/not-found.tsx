import Link from "next/link";

export default function NotFound() {
    return (
        <div className="mx-auto max-w-xl p-6">
            <h1 className="text-xl font-semibold">Page not found</h1>
            <p className="mt-2 text-sm opacity-80">The page you&apos;re looking for doesn&apos;t exist.</p>
            <Link className="mt-4 inline-block rounded-md border px-3 py-1" href="/">Go home</Link>
        </div>
    );
}
