"use client";

export default function TicketHeader({
  title,
  status,
  priority,
  createdAt,
  requester,
  rightSlot,
}: {
  title: string;
  status: string;
  priority: string;
  createdAt: Date | string | number;
  requester?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`badge ${
            status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
            status === 'closed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
            status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
            'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <span className={`badge ${
            priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
            priority === 'high' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
            priority === 'low' ? 'bg-gray-100 text-gray-800 border-gray-200' :
            'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
          </span>
          {requester && <span className="text-sm text-gray-600">Requester: {requester}</span>}
          <span className="text-sm text-gray-600">Created {new Date(createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}


