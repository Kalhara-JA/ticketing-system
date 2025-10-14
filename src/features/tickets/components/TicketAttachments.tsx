/**
 * @fileoverview src/features/tickets/components/TicketAttachments.tsx
 * Attachment display component with RBAC deletion and confirmation modal
 */

"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeAttachmentAction } from "@/features/tickets/actions/userTicket";
import { useToast } from "@/components/Toast";
import ConfirmationModal from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();
  const { addToast } = useToast();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    attachmentId: string;
    filename: string;
  }>({ isOpen: false, attachmentId: "", filename: "" });

  const [preview, setPreview] = useState<{ open: boolean; url: string; filename: string; blobUrl?: string } | null>(null);

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
        startTransition(() => router.refresh());
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

  const isImage = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  const isPdf = (name: string) => /\.(pdf)$/i.test(name);
  const urlFor = (a: { id: string; url?: string }) => a.url ?? `/api/attachments/${a.id}`;

  const openPreview = async (a: { id: string; filename: string; url?: string }) => {
    const url = urlFor(a);
    try {
      // Fetch the image with proper authentication (cookies are included automatically)
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ open: true, url, filename: a.filename, blobUrl });
    } catch (error) {
      console.error('Failed to load image for preview:', error);
      // Fallback to direct URL (might not work due to auth, but worth trying)
      setPreview({ open: true, url, filename: a.filename });
    }
  };

  const closePreview = () => {
    if (preview?.blobUrl) {
      URL.revokeObjectURL(preview.blobUrl);
    }
    setPreview(null);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (preview?.blobUrl) {
        URL.revokeObjectURL(preview.blobUrl);
      }
    };
  }, [preview?.blobUrl]);
  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Attachments</h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((a) => {
            // Security: RBAC - admin or attachment uploader can delete
            const allowDelete = !!canDelete || (!!currentUserId && a.uploadedById === currentUserId);
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">📎</span>
                </div>
                <div className="flex-1">
                  <a className="font-medium text-foreground hover:text-primary transition-colors" href={urlFor(a)} target="_blank" rel="noopener noreferrer">
                    {a.filename}
                  </a>
                </div>
                <div className="flex gap-2">
                  {isImage(a.filename) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPreview(a)}
                    >
                      Preview
                    </Button>
                  ) : isPdf(a.filename) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={urlFor(a)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={urlFor(a)}
                      download={a.filename}
                    >
                      Download
                    </a>
                  </Button>
                </div>
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(a.id, a.filename)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">No attachments yet.</p>
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

      {preview?.open ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="relative max-w-screen-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-10 right-0">
              <button className="btn btn-sm" onClick={closePreview}>Close</button>
            </div>
            <div className="w-full max-h-[80vh] flex items-center justify-center bg-white rounded p-2">
              <img 
                src={preview.blobUrl || preview.url} 
                alt={preview.filename} 
                className="max-w-full max-h-[76vh] object-contain" 
                style={{ width: 'auto', height: 'auto' }}
                onError={(e) => {
                  console.error('Failed to load image:', e);
                  // If blob URL fails, try the direct URL as fallback
                  if (preview.blobUrl && e.currentTarget.src !== preview.url) {
                    e.currentTarget.src = preview.url;
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


