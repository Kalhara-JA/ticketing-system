/**
 * @fileoverview src/app/admin/tickets/page.tsx
 * Admin tickets listing page with advanced filtering and search
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listAllTickets } from "@/features/tickets/repositories/ticketRepository";
import { TICKET_PRIORITIES, TICKET_STATUSES, PAGE_SIZE_DEFAULT } from "@/features/tickets/constants";
import Pagination from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const dynamic = "force-dynamic";

// Business logic: Parse search parameters with array handling
function parseParams(sp: { [k: string]: string | string[] | undefined }) {
    const get = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]);
    const getAll = (k: string) => {
        const values = Array.isArray(sp[k]) ? (sp[k] as string[]) : (sp[k] ? [sp[k] as string] : []);
        // Filter out "all" values to treat them as no filter
        return values.filter(v => v !== "all");
    };
    return {
        q: get("q") || "",
        requester: get("requester") || "",
        status: getAll("status"),
        priority: getAll("priority"),
        page: parseInt(get("page") || "1"),
    };
}

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    await requireAdmin();
    const { q, requester, status, priority, page } = parseParams(params);

    const data = await listAllTickets({
        q, requester, status, priority,
        page,
        pageSize: PAGE_SIZE_DEFAULT,
    });

    const queryParams = new URLSearchParams();
    if (q) queryParams.set("q", q);
    if (requester) queryParams.set("requester", requester);
    status.forEach(s => queryParams.append("status", s));
    priority.forEach(p => queryParams.append("priority", p));

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">All Tickets</h1>
                    <p className="text-muted-foreground">Manage and monitor all service requests</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/dashboard">Dashboard</Link>
                </Button>
            </div>

            {/* Filters */}
            <div className="card p-6">
                <form action="/admin/tickets" method="get">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search</Label>
                            <Input 
                                id="search"
                                name="q" 
                                defaultValue={q} 
                                placeholder="Search title/body…" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="requester">Requester</Label>
                            <Input 
                                id="requester"
                                name="requester" 
                                defaultValue={requester} 
                                placeholder="Username or email" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {TICKET_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select name="priority" defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="All priorities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All priorities</SelectItem>
                                    {TICKET_PRIORITIES.map(p => (
                                        <SelectItem key={p} value={p}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center">
                            <Button type="submit" className="w-full">Apply Filters</Button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Title</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Requester</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Priority</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-lg font-medium">No tickets found</p>
                                            <p className="text-sm">Try adjusting your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.items.map(t => (
                                <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link 
                                            className="font-medium text-foreground hover:text-primary transition-colors" 
                                            href={`/admin/tickets/${t.id}`}
                                        >
                                            {t.title}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        {t.user.username}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={
                                            t.status === 'resolved' ? 'default' :
                                            t.status === 'closed' ? 'secondary' :
                                            t.status === 'in_progress' ? 'default' :
                                            'default'
                                        }>
                                            {t.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={
                                            t.priority === 'urgent' ? 'destructive' :
                                            t.priority === 'high' ? 'default' :
                                            t.priority === 'low' ? 'secondary' :
                                            'default'
                                        }>
                                            {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(t.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                baseUrl="/admin/tickets"
                queryParams={queryParams}
                hasNextPage={data.hasNextPage}
                hasPreviousPage={data.hasPreviousPage}
            />
        </div>
    );
}
