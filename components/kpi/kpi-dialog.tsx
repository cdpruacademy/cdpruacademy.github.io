"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Icon, IconName } from "@/components/icon"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

/** Large dialog for the KPI editors and a person's work list */
export function KpiDialog({
  title,
  subtitle,
  icon,
  wide = false,
  onClose,
  footer,
  toolbar,
  children,
}: {
  title: string
  subtitle?: string
  icon: IconName
  wide?: boolean
  onClose: () => void
  footer?: React.ReactNode
  /** Sits under the header and stays put while the body scrolls */
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  const ref = useDialogA11y(true, onClose)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-dialog-title"
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_-16px_rgba(28,25,23,0.45)] ${wide ? "max-w-[960px]" : "max-w-[640px]"}`}
      >
        <header className="flex items-center gap-3.5 px-5 pt-5 pb-4 sm:px-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-pru-red text-white">
            <Icon name={icon} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="kpi-dialog-title" className="text-lg leading-tight font-bold text-ink sm:text-[22px]">
              {title}
            </h2>
            {subtitle && <p className="text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
          >
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </header>
        {toolbar && <div className="border-t border-rule px-5 py-3 sm:px-7">{toolbar}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-rule px-5 py-3.5 sm:px-7">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
