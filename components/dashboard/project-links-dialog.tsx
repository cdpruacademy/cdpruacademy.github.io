"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { cardButton, cardButtonDark } from "@/components/page-hero"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"
import { ProductItem } from "@/lib/timeline-data"
import { ProjectLink } from "@/lib/supabase"
import { toast } from "@/lib/notify"

interface ProjectLinksDialogProps {
  product: ProductItem
  links: ProjectLink[]
  onSave: (links: ProjectLink[]) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

const isWebLink = (url: string) => /^https?:\/\/\S+$/i.test(url.trim())

const input =
  "h-10 min-w-0 rounded-[12px] border-[1.5px] border-rule px-3 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"

/** Final-file links of one project. Opened per project, so the rows start from its links. */
export function ProjectLinksDialog({ product, links, onSave, onClose }: ProjectLinksDialogProps) {
  const [rows, setRows] = useState<ProjectLink[]>(links.length > 0 ? links : [{ label: "", url: "" }])
  const [saving, setSaving] = useState(false)
  const dialogRef = useDialogA11y(true, onClose)

  const filled = rows.filter((r) => r.url.trim())
  const invalid = filled.some((r) => !isWebLink(r.url))

  const update = (i: number, patch: Partial<ProjectLink>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const handleSave = async () => {
    if (invalid) return
    setSaving(true)
    const res = await onSave(
      filled.map((r) => ({ label: r.label.trim() || product.broker || "File", url: r.url.trim() }))
    )
    setSaving(false)
    if (res.success) onClose()
    else toast.error("บันทึกลิงก์ไม่สำเร็จ: " + (res.error || ""))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-links-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(28,25,23,0.45)]"
      >
        <header className="flex items-center gap-3 border-b border-rule py-4 pr-4 pl-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
            <Icon name="folder" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="project-links-title" className="text-[19px] leading-tight font-bold text-ink">
              Final files
            </h2>
            <p className="truncate text-[13px] text-ink-soft">{product.name.replace(/\n/g, " ")}</p>
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

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={product.broker || "ttb"}
                aria-label={`File ${i + 1} name`}
                className={`${input} w-full sm:w-[130px]`}
              />
              <input
                value={row.url}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="https://…sharepoint.com/…"
                aria-label={`File ${i + 1} link`}
                aria-invalid={row.url.trim() !== "" && !isWebLink(row.url)}
                className={`${input} flex-1 ${row.url.trim() && !isWebLink(row.url) ? "border-brand-ink" : ""}`}
              />
              {isWebLink(row.url) && (
                <a
                  href={row.url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${row.label || "file"}`}
                  className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
                >
                  <Icon name="external" size={18} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove file ${i + 1}`}
                className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-brand-ink"
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { label: "", url: "" }])}
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            <Icon name="plus" size={16} />
            Add link
          </button>
          {invalid && (
            <p role="alert" className="text-[13px] text-brand-ink">
              ลิงก์ต้องขึ้นต้นด้วย https://
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-rule px-5 py-3.5">
          <button type="button" onClick={onClose} className={cardButton}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || invalid} className={cardButtonDark}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
