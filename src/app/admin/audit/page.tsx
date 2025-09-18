import { requireAdmin } from "@/lib/auth/session";
import { listAuditLogs } from "@/features/audit/auditRepository";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

function parseParams(sp: { [k: string]: string | string[] | undefined }) {
  const get = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]);
  return {
    page: parseInt(get("page") || "1"),
    actor: get("actor") || "",
    targetType: get("targetType") || "",
    action: get("action") || "",
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
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">System activity across tickets, comments and attachments</p>
        </div>
      </div>

      <div className="card p-6">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4" action="/admin/audit" method="get">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Actor</label>
            <input name="actor" defaultValue={actor} placeholder="username or email" className="input" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Target Type</label>
            <select name="targetType" defaultValue={targetType} className="input">
              <option value="">All</option>
              <option value="ticket">ticket</option>
              <option value="comment">comment</option>
              <option value="attachment">attachment</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Action</label>
            <select name="action" defaultValue={action} className="input">
              <option value="">All</option>
              <option value="ticket:create">ticket:create</option>
              <option value="ticket:status_change">ticket:status_change</option>
              <option value="ticket:priority_change">ticket:priority_change</option>
              <option value="comment:add">comment:add</option>
              <option value="comment:delete">comment:delete</option>
              <option value="attachment:add">attachment:add</option>
              <option value="attachment:remove">attachment:remove</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary btn-md w-full">Apply</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Time</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actor</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Action</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Target</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-600">No audit entries found.</td>
                </tr>
              ) : (
                data.items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{a.actor?.username ?? a.actor?.email ?? "-"}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{a.action}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{a.targetType} #{a.targetId}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{a.ip ?? "-"}</td>
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


