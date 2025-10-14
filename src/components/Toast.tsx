/**
 * @fileoverview src/components/Toast.tsx
 * Toast notification system using shadcn Sonner
 */

"use client";

import { toast as sonnerToast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}


// For backward compatibility, we'll create a simple context that uses Sonner
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export function useToast() {
  const addToast = (toast: Omit<Toast, "id">) => {
    const { type, title, message, duration = 5000 } = toast;
    
    switch (type) {
      case "success":
        sonnerToast.success(title, {
          description: message,
          duration,
        });
        break;
      case "error":
        sonnerToast.error(title, {
          description: message,
          duration,
        });
        break;
      case "warning":
        sonnerToast.warning(title, {
          description: message,
          duration,
        });
        break;
      case "info":
        sonnerToast.info(title, {
          description: message,
          duration,
        });
        break;
      default:
        sonnerToast(title, {
          description: message,
          duration,
        });
    }
  };

  const removeToast = (id: string) => {
    sonnerToast.dismiss(id);
  };

  const clearAllToasts = () => {
    sonnerToast.dismiss();
  };

  return {
    toasts: [], // Sonner manages its own state
    addToast,
    removeToast,
    clearAllToasts,
  };
}
