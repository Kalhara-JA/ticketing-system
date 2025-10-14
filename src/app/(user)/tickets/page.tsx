/**
 * @fileoverview src/app/(user)/tickets/page.tsx
 * User tickets listing page with search, filtering, and pagination
 */

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listUserTickets } from "@/features/tickets/repositories/ticketRepository";
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
        status: getAll("status"),
        priority: getAll("priority"),
        page: parseInt(get("page") || "1"),
    };
}

export default async function MyTicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const user = await requireUser();
    const { q, status, priority, page } = parseParams(params);

    const data = await listUserTickets({
        userId: user.id,
        q, status, priority,
        page,
        pageSize: PAGE_SIZE_DEFAULT,
    });

    const queryParams = new URLSearchParams();
    if (q) queryParams.set("q", q);
    status.forEach(s => queryParams.append("status", s));
    priority.forEach(p => queryParams.append("priority", p));

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">My Tickets</h1>
                    <p className="text-muted-foreground">Manage and track your service requests</p>
                </div>
                <Button asChild>
                    <Link href="/tickets/new">New Ticket</Link>
                </Button>
            </div>

            {/* Filters */}
            <div className="card p-6">
                <form action="/tickets" method="get">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Priority</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-lg font-medium">No tickets found</p>
                                            <p className="text-sm">Create your first ticket to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.items.map(t => (
                                <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link 
                                            className="font-medium text-foreground hover:text-primary transition-colors" 
                                            href={`/tickets/${t.id}`}
                                        >
                                            {t.title}
                                        </Link>
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
                baseUrl="/tickets"
                queryParams={queryParams}
                hasNextPage={data.hasNextPage}
                hasPreviousPage={data.hasPreviousPage}
            />
        </div>
    );
}
