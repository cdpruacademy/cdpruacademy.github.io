"use client"

import * as React from "react"
import { useState } from "react"
import { createPortal } from "react-dom"
import { ProductItem, TimelineType } from "@/lib/timeline-data"
import { Icon, PHASE_ICONS } from "@/components/icon"
import { Partner, partnerOf } from "@/lib/partners"
import { PHASE_HEADINGS, formatShortDate, stepKinds } from "./timeline-row"
import { useProjectLinks } from "@/hooks/use-project-links"
import { ProjectLinksDialog } from "./project-links-dialog"

interface TimelineMobileListProps {
  items: ProductItem[]
  timelineType: TimelineType
  isAdmin: boolean
  partners: Partner[]
  onEdit: (product: ProductItem) => void
  onPause: (product: ProductItem) => void
  onResume: (product: ProductItem) => void
  onDelete: (product: ProductItem) => void
}

/**
 * Phone layout of the timeline: one card per project with its partner, progress dots, Current
 * step and launch date; tap to see every step and the admin actions.
 */
export function TimelineMobileList({
  items,
  timelineType,
  isAdmin,
  partners,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: TimelineMobileListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const { links, saveLinks } = useProjectLinks(isAdmin)
  const [linksFor, setLinksFor] = useState<ProductItem | null>(null)
  const actionButton =
    "touch-target flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-full border border-rule bg-white text-sm font-semibold text-ink"

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const { phases, kinds, current, isFinished } = stepKinds(item, timelineType)
        const toneBg = isFinished ? "bg-done" : item.isPaused ? "bg-stone-600" : "bg-pru-red"
        const toneLine = isFinished ? "border-done-line" : item.isPaused ? "border-stone-300" : "border-pru-red-line"
        const partner = partnerOf(item.broker, partners)
        const isOpen = openId === item.id
        const panelId = `mobile-steps-${item.id}`
        const currentPhase = current >= 0 ? phases[current] : null
        const launch = item.customRightLabel
          ? formatShortDate(item.customRightLabel)
          : formatShortDate(item.commercialDate) || "TBC"

        return (
          <li
            key={item.id}
            className={`overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-card)] ${item.isPaused ? "opacity-70" : ""}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full flex-col gap-3 p-4 text-left"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white"
                    style={{ background: partner.color }}
                  >
                    <Icon name="partner" size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] leading-snug font-semibold text-ink">
                      {item.name.replace(/\n/g, " ")}
                    </span>
                    <span className="truncate text-xs text-ink-soft">
                      <b className="text-ink">{item.broker}</b> · {item.owner}
                    </span>
                  </span>
                </span>
                <span className={`flex shrink-0 flex-col items-center overflow-hidden rounded-xl border ${toneLine}`}>
                  <span className={`w-full px-2 text-center text-[10px] font-bold text-white ${toneBg}`}>Launch</span>
                  <span className="px-2 text-[15px] leading-snug font-bold text-ink">{launch}</span>
                </span>
              </span>

              <span className="flex items-center" aria-hidden="true">
                {kinds.map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span
                        className={`h-0.5 flex-1 ${i <= (isFinished ? kinds.length - 1 : current) && k !== "todo" ? toneBg : "bg-rule"}`}
                      />
                    )}
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full ${
                        k === "done"
                          ? `h-5 w-5 text-white ${toneBg}`
                          : k === "now"
                            ? item.isPaused
                              ? "h-7 w-7 bg-stone-600 text-white shadow-[0_0_0_3px_#E7E5E4]"
                              : "h-7 w-7 bg-pru-red text-white shadow-[0_0_0_3px_#FFE1E4]"
                            : k === "todo"
                              ? "h-5 w-5 border-[1.5px] border-stone-300 bg-white text-stone-400"
                              : "h-0 w-0"
                      }`}
                    >
                      {k === "done" && <Icon name="check" size={11} strokeWidth={3.4} />}
                      {k === "now" && <Icon name={PHASE_ICONS[phases[i].key]} size={14} strokeWidth={2} />}
                    </span>
                  </React.Fragment>
                ))}
              </span>

              <span className="flex items-center justify-between gap-2 text-[13px]">
                {item.isPaused ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                    <Icon name="onHold" size={15} />
                    On hold since {item.pausedSince}
                  </span>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-done">
                    <Icon name="completed" size={15} />
                    Completed
                  </span>
                ) : currentPhase ? (
                  <span className="truncate font-semibold text-brand-ink">
                    Current: {PHASE_HEADINGS[currentPhase.key].replace("\n", " ")}
                    {item.milestones[currentPhase.key]?.date
                      ? ` · ${formatShortDate(item.milestones[currentPhase.key]?.date)}`
                      : ""}
                  </span>
                ) : (
                  <span>Waiting for Target Launch</span>
                )}
                <span className="inline-flex shrink-0 items-center gap-1 text-ink-soft">
                  {isOpen ? "Hide steps" : "All steps"}
                  <Icon name="chevronDown" size={14} className={isOpen ? "rotate-180" : ""} />
                </span>
              </span>
            </button>

            {isOpen && (
              <div id={panelId} className="flex flex-col gap-3 border-t border-surface px-4 pt-3 pb-4">
                <ol className="flex flex-col gap-2.5">
                  {phases.map((phase, i) => {
                    const k = kinds[i]
                    if (k === "skip") return null
                    return (
                      <li key={phase.key} className="flex items-center gap-3 text-sm">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            k === "done"
                              ? `text-white ${toneBg}`
                              : k === "now"
                                ? "bg-pru-red text-white"
                                : "border-[1.5px] border-stone-300 text-stone-400"
                          }`}
                        >
                          <Icon name={k === "done" ? "check" : PHASE_ICONS[phase.key]} size={14} strokeWidth={k === "done" ? 3 : 1.9} />
                        </span>
                        <span className={`flex-1 ${k === "now" ? "font-bold text-ink" : k === "todo" ? "text-ink-soft" : "text-ink"}`}>
                          {PHASE_HEADINGS[phase.key].replace("\n", " ")}
                          <span className="sr-only">
                            {k === "done" ? " (Completed)" : k === "now" ? " (Current)" : " (Upcoming)"}
                          </span>
                        </span>
                        <span className="text-[13px] text-ink-soft">
                          {formatShortDate(item.milestones[phase.key]?.date) || "—"}
                        </span>
                      </li>
                    )
                  })}
                </ol>
                <div className="flex justify-between border-t border-surface pt-2.5 text-[13px] text-ink-soft">
                  <span>Internal {formatShortDate(item.internalDate) || "TBC"}</span>
                  <span>
                    Target Launch <b className="text-ink">{formatShortDate(item.commercialDate) || "TBC"}</b>
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(item)} className={actionButton}>
                      <Icon name="edit" size={16} />
                      Edit
                    </button>
                    {item.isPaused ? (
                      <button type="button" onClick={() => onResume(item)} className={actionButton}>
                        <Icon name="refresh" size={16} />
                        Resume
                      </button>
                    ) : (
                      <button type="button" onClick={() => onPause(item)} className={actionButton}>
                        <Icon name="onHold" size={16} />
                        On hold
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLinksFor(item)}
                      aria-label="Final files"
                      className="inline-flex h-11 w-11 touch-target items-center justify-center rounded-full border border-rule bg-white text-ink-soft hover:text-ink"
                    >
                      <Icon name="folder" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      aria-label="Delete project"
                      className="inline-flex h-11 w-11 touch-target items-center justify-center rounded-full border border-rule bg-white text-ink-soft hover:text-brand-ink"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                )}
                {isAdmin && (links[item.id] || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {links[item.id].map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold text-ink"
                      >
                        <Icon name="folder" size={14} />
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
      {linksFor &&
        createPortal(
          <ProjectLinksDialog
            product={linksFor}
            links={links[linksFor.id] || []}
            onSave={(next) => saveLinks(linksFor.id, next)}
            onClose={() => setLinksFor(null)}
          />,
          document.body
        )}
    </ul>
  )
}
