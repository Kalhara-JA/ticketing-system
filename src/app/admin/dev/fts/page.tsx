// src/app/admin/dev/fts/page.tsx
import { requireAdmin } from "@/lib/auth/session";
import { searchTicketsFTS } from "@/features/tickets/repositories/metricsRepository";

export default async function FTSDev({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    await requireAdmin();
    const params = await searchParams;
    const q = params?.q ?? "";
    const rows = q ? await searchTicketsFTS(q, 20) : [];
    return (
        <div className="space-y-3">
            <h1 className="text-xl font-semibold">FTS Test</h1>
            <form className="flex gap-2" action="/admin/dev/fts" method="get">
                <input name="q" defaultValue={q} placeholder="search…" className="rounded-md border p-2" />
                <button className="rounded-md border px-3 py-2">Run</button>
            </form>
            <ul className="list-disc pl-5 text-sm">
                {rows.map((r) => (
                    <li key={r.id}>
                        <span className="font-medium">{r.title}</span> — rank {r.rank.toFixed(3)}
                    </li>
                ))}
            </ul>
        </div>
    );
}
