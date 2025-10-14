/**
 * @fileoverview src/app/admin/audit/page.tsx
 * Admin audit log page with filtering and security event tracking
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listAuditLogs } from "@/features/audit/auditRepository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

// Business logic: Parse search parameters for audit log filtering
function parseParams(sp: { [k: string]: string | string[] | undefined }) {
  const get = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]);
  const getValue = (k: string) => {
    const value = get(k);
    return value === "all" ? "" : (value || "");
  };
  return {
    page: parseInt(get("page") || "1"),
    actor: get("actor") || "",
    targetType: getValue("targetType"),
    action: getValue("action"),
  };
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const { page, actor, targetType, action } = parseParams(params);

  const data = await listAuditLogs({ page, pageSize: 20, actor, targetType, action });

  const queryParams = new URLSearchParams();
  if (actor) queryParams.set("actor", actor);
  if (targetType) queryParams.set("targetType", targetType);
  if (action) queryParams.set("action", action);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">System activity across tickets, comments and attachments</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">Dashboard</Link>
        </Button>
      </div>

      <div className="card p-6">
        <form action="/admin/audit" method="get">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="actor">Actor</Label>
              <Input 
                id="actor"
                name="actor" 
                defaultValue={actor} 
                placeholder="username or email" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetType">Target Type</Label>
              <Select name="targetType" defaultValue={targetType || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ticket">ticket</SelectItem>
                  <SelectItem value="comment">comment</SelectItem>
                  <SelectItem value="attachment">attachment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select name="action" defaultValue={action || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ticket:create">ticket:create</SelectItem>
                  <SelectItem value="ticket:status_change">ticket:status_change</SelectItem>
                  <SelectItem value="ticket:priority_change">ticket:priority_change</SelectItem>
                  <SelectItem value="comment:add">comment:add</SelectItem>
                  <SelectItem value="comment:delete">comment:delete</SelectItem>
                  <SelectItem value="attachment:add">attachment:add</SelectItem>
                  <SelectItem value="attachment:remove">attachment:remove</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <Button type="submit" className="w-full">Apply Filters</Button>
            </div>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Time</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Actor</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Action</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Target</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No audit entries found.</td>
                </tr>
              ) : (
                data.items.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-foreground">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{a.actor?.username ?? a.actor?.email ?? "-"}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{a.action}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{a.targetType} #{a.targetId}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{a.ip ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        baseUrl="/admin/audit"
        queryParams={queryParams}
        hasNextPage={data.hasNextPage}
        hasPreviousPage={data.hasPreviousPage}
      />
    </div>
  );
}


