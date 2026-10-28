// In-page replacements for window.alert / window.confirm, rendered by <NotifyHost /> in the layout.
// Usable from hooks and plain functions, not only components.

import type { IconName } from "@/components/icon";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  /** Icon in the dialog; defaults to a warning sign (danger) or info (default) */
  icon?: IconName;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

type Listener = () => void;

let nextId = 1;
let toasts: ToastItem[] = [];
let confirmQueue: ConfirmRequest[] = [];
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function subscribeNotify(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getToasts = () => toasts;
export const getActiveConfirm = () => confirmQueue[0] || null;

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, kind, message }];
  emit();
  // Errors stay longer so there is time to read the cause
  setTimeout(() => dismissToast(id), kind === "error" ? 8000 : 4500);
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++;
    confirmQueue = [
      ...confirmQueue,
      {
        ...options,
        id,
        resolve: (ok) => {
          confirmQueue = confirmQueue.filter((c) => c.id !== id);
          emit();
          resolve(ok);
        },
      },
    ];
    emit();
  });
}
