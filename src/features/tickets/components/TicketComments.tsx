"use client";

import { useTransition, useState } from "react";
import { deleteCommentAction } from "@/features/comments/actions";

export default function TicketComments({
  comments,
  after,
  canDelete,
  currentUserId,
}: {
  comments: { id: string; body: string; createdAt: string | Date; deletedAt: Date | null; author: { id: string; username: string; role: string } }[];
  after?: React.ReactNode;
  canDelete?: boolean;
  currentUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Comments</h2>
      <div className="space-y-4">
        {comments.map((c) => {
          const allowDelete = !!canDelete || (!!currentUserId && c.author.id === currentUserId);
          return (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-gray-900">{c.author.username}</span>
                {c.author.role === "admin" && <span className="badge badge-default text-xs">Admin</span>}
                <span className="text-sm text-gray-600">{new Date(c.createdAt).toLocaleString()}</span>
                {allowDelete && !c.deletedAt && (
                  <button
                    className="ml-auto btn btn-ghost btn-sm"
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        try {
                          await deleteCommentAction(c.id);
                          window.location.reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to delete");
                        }
                      });
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              {c.deletedAt ? (
                <div className="italic text-gray-600">[Comment deleted]</div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-900">
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              )}
            </div>
          );
        })}
        {comments.length === 0 && <p className="text-center text-gray-600 py-8">No comments yet.</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isPending && <p className="text-sm text-gray-600">Working…</p>}
      {after ? <div className="mt-6">{after}</div> : null}
    </div>
  );
}


