export default function TicketAttachments({
  items,
  after,
}: {
  items: { id: string; filename: string; url?: string }[];
  after?: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Attachments</h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">📎</span>
              </div>
              <div className="flex-1">
                <a className="font-medium text-gray-900 hover:text-blue-600 transition-colors" href={a.url ?? `/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer">
                  {a.filename}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No attachments yet.</p>
      )}
      {after ? <div className="mt-4">{after}</div> : null}
    </div>
  );
}


