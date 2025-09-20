/**
 * @fileoverview src/features/tickets/components/TicketComments.tsx
 * Comment display component with RBAC deletion and confirmation modal
 */

"use client";

import { useTransition, useState } from "react";
import { deleteCommentAction } from "@/features/comments/actions";
import { useToast } from "@/components/Toast";
import ConfirmationModal from "@/components/ConfirmationModal";

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
  const { addToast } = useToast();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    commentId: string;
    commentBody: string;
  }>({ isOpen: false, commentId: "", commentBody: "" });

  const handleDeleteClick = (commentId: string, commentBody: string) => {
    setDeleteModal({ isOpen: true, commentId, commentBody });
  };

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      try {
        await deleteCommentAction(deleteModal.commentId);
        addToast({
          type: "success",
          title: "Comment deleted",
          message: "The comment has been successfully deleted."
        });
        setDeleteModal({ isOpen: false, commentId: "", commentBody: "" });
        window.location.reload();
      } catch (e) {
        addToast({
          type: "error",
          title: "Failed to delete comment",
          message: e instanceof Error ? e.message : "An unexpected error occurred."
        });
      }
    });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, commentId: "", commentBody: "" });
  };

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Comments</h2>
      <div className="space-y-4">
        {comments.map((c) => {
          // Security: RBAC - admin or comment author can delete
          const allowDelete = !!canDelete || (!!currentUserId && c.author.id === currentUserId);
          return (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-gray-900">{c.author.username}</span>
                {c.author.role === "admin" && <span className="badge badge-default text-xs">Admin</span>}
                <span className="text-sm text-gray-600">{new Date(c.createdAt).toLocaleString()}</span>
                {allowDelete && !c.deletedAt && (
                  <button
                    className="ml-auto btn btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(c.id, c.body)}
                    disabled={isPending}
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
      {isPending && <p className="text-sm text-gray-600">Working…</p>}
      {after ? <div className="mt-6">{after}</div> : null}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        message={`Are you sure you want to delete this comment? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}


