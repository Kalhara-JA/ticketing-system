/**
 * @fileoverview src/app/admin/dashboard/page.tsx
 * Admin dashboard with ticket metrics, KPIs, and trend visualization
 */

import {
    getOpenCount,
    getTotalCount,
    getStatusCounts,
    getPriorityCounts,
    getDailyOpened,
    getDailyResolved,
    getAvgResolutionHours,
} from "@/features/tickets/repositories/metricsRepository";
import { requireAdmin } from "@/lib/auth/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export const revalidate = 60; // refresh at most once per minute

// Business logic: Convert Map to ordered array for consistent display
function toPairs<T extends string>(map: Map<T, number>, order: T[]) {
    return order.map((k) => [k, map.get(k) ?? 0] as const);
}

export default async function AdminDashboardPage() {
    await requireAdmin();

    const [
        total,
        open,
        statusMap,
        priorityMap,
        opened,
        resolved,
        avgHours,
    ] = await Promise.all([
        getTotalCount(),
        getOpenCount(),
        getStatusCounts(),
        getPriorityCounts(),
        getDailyOpened(14),
        getDailyResolved(14),
        getAvgResolutionHours(),
    ]);

    const statusPairs = toPairs(statusMap, [
        "new",
        "in_progress",
        "waiting_on_user",
        "reopened",
        "resolved",
        "closed",
    ]);

    const priorityPairs = toPairs(priorityMap, ["urgent", "high", "normal", "low"]);

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Overview of ticket system performance</p>
                </div>
                <Link 
                    href="/admin/tickets" 
                    className="btn btn-primary btn-md"
                >
                    View All Tickets
                </Link>
            </div>

            {/* KPI cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <KPI label="Total Tickets" value={total} />
                <KPI label="Open Tickets" value={open} />
                <KPI label="Avg Resolution (h)" value={avgHours ? avgHours.toFixed(1) : "—"} />
                <KPI label="Resolved (14d)" value={resolved.reduce((a, b) => a + b.count, 0)} />
            </div>

            {/* Status breakdown */}
            <div className="card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Tickets by Status</h2>
                <SimpleTable
                    headers={["Status", "Count"]}
                    rows={statusPairs.map(([s, c]) => [prettyStatus(s), String(c)])}
                />
            </div>

            {/* Priority breakdown */}
            <div className="card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Tickets by Priority</h2>
                <SimpleTable
                    headers={["Priority", "Count"]}
                    rows={priorityPairs.map(([p, c]) => [p.charAt(0).toUpperCase() + p.slice(1), String(c)])}
                />
            </div>

            {/* Trends */}
            <div className="grid gap-6 lg:grid-cols-2">
                <TrendCard title="Opened (last 14 days)" series={opened} />
                <TrendCard title="Resolved (last 14 days)" series={resolved} />
            </div>
        </div>
    );
}

    function KPI({ label, value }: { label: string; value: number | string }) {
        return (
            <div className="card p-6">
                <div className="text-sm font-medium text-gray-600">{label}</div>
                <div className="text-3xl font-bold text-gray-900">{value}</div>
            </div>
        );
    }

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {headers.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={headers.length} className="h-24 text-center">
                            No data available.
                        </TableCell>
                    </TableRow>
                ) : (
                    rows.map((r, i) => (
                        <TableRow key={i}>
                            {r.map((cell, j) => (
                                <TableCell key={j}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

function TrendCard({
    title,
    series,
}: {
    title: string;
    series: { day: Date; count: number }[];
}) {
    // UX: Lightweight sparkline visualization without external dependencies
    const max = Math.max(1, ...series.map((s) => s.count));
    return (
        <div className="card p-6">
            <div className="mb-4 text-sm font-medium text-gray-600">{title}</div>
            <div className="flex items-end gap-1 h-24">
                {series.map((s) => {
                    const h = (s.count / max) * 96; // 96px max inside 24 * 4 rem
                    return (
                        <div
                            key={s.day.toISOString()}
                            title={`${s.day.toDateString()}: ${s.count}`}
                            className="w-3 rounded-sm bg-blue-600"
                            style={{ height: `${h}px` }}
                        />
                    );
                })}
            </div>
            <div className="mt-3 text-sm text-gray-600">
                Total: <span className="font-medium text-gray-900">{series.reduce((a, b) => a + b.count, 0)}</span>
            </div>
        </div>
    );
}

function prettyStatus(s: string) {
    return s
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
}
