/**
 * @fileoverview src/features/tickets/components/TicketAttachments.tsx
 * Attachment display component with RBAC deletion and confirmation modal
 */

"use client";

import { useTransition, useState } from "react";
import { removeAttachmentAction } from "@/features/tickets/actions/userTicket";
import { useToast } from "@/components/Toast";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function TicketAttachments({
  items,
  after,
  canDelete,
  currentUserId,
}: {
  items: { id: string; filename: string; url?: string; uploadedById?: string }[];
  after?: React.ReactNode;
  canDelete?: boolean;
  currentUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    attachmentId: string;
    filename: string;
  }>({ isOpen: false, attachmentId: "", filename: "" });

  const handleDeleteClick = (attachmentId: string, filename: string) => {
    setDeleteModal({ isOpen: true, attachmentId, filename });
  };

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      try {
        await removeAttachmentAction(deleteModal.attachmentId);
        addToast({
          type: "success",
          title: "Attachment deleted",
          message: "The attachment has been successfully deleted."
        });
        setDeleteModal({ isOpen: false, attachmentId: "", filename: "" });
        window.location.reload();
      } catch (e) {
        addToast({
          type: "error",
          title: "Failed to delete attachment",
          message: e instanceof Error ? e.message : "An unexpected error occurred."
        });
      }
    });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, attachmentId: "", filename: "" });
  };
  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Attachments</h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((a) => {
            // Security: RBAC - admin or attachment uploader can delete
            const allowDelete = !!canDelete || (!!currentUserId && a.uploadedById === currentUserId);
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">📎</span>
                </div>
                <div className="flex-1">
                  <a className="font-medium text-gray-900 hover:text-blue-600 transition-colors" href={a.url ?? `/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer">
                    {a.filename}
                  </a>
                </div>
                {allowDelete && (
                  <button
                    className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(a.id, a.filename)}
                    disabled={isPending}
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">No attachments yet.</p>
      )}
      {after ? <div className="mt-4">{after}</div> : null}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${deleteModal.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}


