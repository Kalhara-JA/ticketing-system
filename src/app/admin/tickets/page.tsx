import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listAllTickets } from "@/features/tickets/repositories/ticketRepository";
import { TICKET_PRIORITIES, TICKET_STATUSES, PAGE_SIZE_DEFAULT } from "@/features/tickets/constants";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

function parseParams(sp: { [k: string]: string | string[] | undefined }) {
    const get = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]);
    const getAll = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[]) : (sp[k] ? [sp[k] as string] : []));
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
                    <h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
                    <p className="text-gray-600">Manage and monitor all service requests</p>
                </div>
                <Link className="btn btn-outline btn-md" href="/admin/dashboard">
                    Dashboard
                </Link>
            </div>

            {/* Filters */}
            <div className="card p-6">
                <form className="grid grid-cols-1 gap-4 md:grid-cols-6" action="/admin/tickets" method="get">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Search</label>
                        <input 
                            name="q" 
                            defaultValue={q} 
                            placeholder="Search title/body…" 
                            className="input" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Requester</label>
                        <input 
                            name="requester" 
                            defaultValue={requester} 
                            placeholder="Username or email" 
                            className="input" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Status</label>
                        <select name="status" defaultValue="" className="input">
                            <option value="">All statuses</option>
                            {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Priority</label>
                        <select name="priority" defaultValue="" className="input">
                            <option value="">All priorities</option>
                            {TICKET_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button className="btn btn-primary btn-md w-full">Apply Filters</button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Title</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Requester</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Priority</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600">
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-lg font-medium">No tickets found</p>
                                            <p className="text-sm">Try adjusting your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.items.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link 
                                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors" 
                                            href={`/admin/tickets/${t.id}`}
                                        >
                                            {t.title}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {t.user.username}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${
                                            t.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                                            t.status === 'closed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                            t.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                            'bg-blue-100 text-blue-800 border-blue-200'
                                        }`}>
                                            {t.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${
                                            t.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                                            t.priority === 'high' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                            t.priority === 'low' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                            'bg-blue-100 text-blue-800 border-blue-200'
                                        }`}>
                                            {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
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
