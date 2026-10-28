"use client"

import * as React from "react"
import { useEffect, useSyncExternalStore } from "react"
import { Icon, type IconName } from "@/components/icon"
import { cardButton } from "@/components/page-hero"
import {
  dismissToast,
  getActiveConfirm,
  getToasts,
  subscribeNotify,
  ToastItem,
} from "@/lib/notify"

const EMPTY: ToastItem[] = []

// Dark toast with a coloured dot: green = done, red = failed, grey = info
const TOAST_STYLE: Record<ToastItem["kind"], { icon: IconName; dot: string }> = {
  success: { icon: "check", dot: "bg-done" },
  error: { icon: "close", dot: "bg-pru-red" },
  info: { icon: "info", dot: "bg-ink-soft" },
}

export function NotifyHost() {
  const toasts = useSyncExternalStore(subscribeNotify, getToasts, () => EMPTY)
  const request = useSyncExternalStore(subscribeNotify, getActiveConfirm, () => null)

  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") request.resolve(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [request])

  const isDanger = request?.tone === "danger"
  const confirmIcon: IconName = request?.icon || (isDanger ? "warning" : "info")

  return (
    <>
      {/* Toasts: above the phone tab bar on phones, bottom right on larger screens */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLE[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex animate-in items-center gap-3 rounded-[18px] bg-ink py-2.5 pr-2 pl-3 text-white shadow-[0_16px_40px_-12px_rgba(28,25,23,0.55)] duration-200 fade-in slide-in-from-bottom-2"
            >
              <span
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${style.dot}`}
              >
                <Icon name={style.icon} size={16} strokeWidth={2.6} />
              </span>
              <p className="flex-1 text-sm leading-relaxed whitespace-pre-line">{t.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="ปิดข้อความ"
                className="touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-white/10 hover:text-white"
              >
                <Icon name="close" size={16} strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirm dialog */}
      {request && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 animate-in bg-ink/40 fade-in"
            onClick={() => request.resolve(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-[360px] animate-in rounded-3xl bg-white p-6 shadow-[0_24px_64px_-16px_rgba(28,25,23,0.45)] duration-200 zoom-in-95"
          >
            <span
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl ${
                isDanger ? "bg-pru-red-soft text-brand-ink" : "bg-surface text-ink"
              }`}
            >
              <Icon name={confirmIcon} size={26} strokeWidth={1.9} />
            </span>
            <h2 id="confirm-title" className="mt-4 text-xl leading-snug font-bold text-ink">
              {request.title}
            </h2>
            {request.message && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{request.message}</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => request.resolve(false)}
                className={`${cardButton} h-11 justify-center`}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => request.resolve(true)}
                className={`touch-target inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold whitespace-nowrap text-white transition-colors ${
                  isDanger ? "bg-pru-red hover:brightness-95" : "bg-ink hover:bg-brand-hover"
                }`}
              >
                {request.confirmLabel || "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
