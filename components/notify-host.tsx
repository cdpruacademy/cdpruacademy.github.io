"use client";

import * as React from "react";
import { useEffect, useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  dismissToast,
  getActiveConfirm,
  getToasts,
  subscribeNotify,
  ToastItem,
} from "@/lib/notify";

const EMPTY: ToastItem[] = [];

const TOAST_STYLE = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600" },
  error: { icon: XCircle, iconClass: "text-brand-ink" },
  info: { icon: Info, iconClass: "text-sky-600" },
} as const;

export function NotifyHost() {
  const toasts = useSyncExternalStore(subscribeNotify, getToasts, () => EMPTY);
  const request = useSyncExternalStore(subscribeNotify, getActiveConfirm, () => null);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") request.resolve(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request]);

  const isDanger = request?.tone === "danger";

  return (
    <>
      {/* Toasts: bottom center on phones, bottom right on larger screens */}
      <div
        aria-live="polite"
        className="fixed z-[60] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 flex flex-col gap-2 sm:w-96 pointer-events-none"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLE[t.kind];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-white border border-gray-200 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)] pl-3.5 pr-2 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-px ${style.iconClass}`} />
              <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-line">{t.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="ปิดข้อความ"
                className="touch-target p-1 text-gray-500 hover:text-gray-700 rounded-md shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {request && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 animate-in fade-in" onClick={() => request.resolve(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isDanger ? "bg-red-50 text-brand-ink" : "bg-slate-100 text-slate-600"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h2 id="confirm-title" className="text-base font-bold text-gray-900 leading-snug">
                  {request.title}
                </h2>
                {request.message && <p className="text-sm text-gray-600 leading-relaxed">{request.message}</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => request.resolve(false)}
                className="touch-target px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => request.resolve(true)}
                className={`touch-target px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors ${
                  isDanger ? "bg-brand-fill hover:bg-brand-hover" : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                {request.confirmLabel || "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
