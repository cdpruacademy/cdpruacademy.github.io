"use client"

import * as React from "react"
import { useRef, useState } from "react"
import {
  ProductItem,
  PRODUCT_PHASES,
  ENHANCEMENT_PHASES,
  TimelineType,
  checkIsProjectCompleted,
} from "@/lib/timeline-data"
import { toPng } from "html-to-image"
import { Icon, PHASE_ICONS } from "@/components/icon"
import { Partner, inkOf, tintOf } from "@/lib/partners"

interface TimelineRowProps {
  product: ProductItem
  timelineType?: TimelineType
  isAdmin?: boolean
  onEdit: (product: ProductItem) => void
  onDelete: (product: ProductItem) => void
  onPause: (product: ProductItem) => void
  onResume: (product: ProductItem) => void
  /** Smaller paddings for the LINE image */
  compact?: boolean
}

// "19 May 2026" -> "19 May"; "TBC" stays
export const formatShortDate = (dateStr?: string): string =>
  dateStr ? dateStr.replace(/[, ]*\b(20\d{2}|25\d{2})\b/g, "").trim() : ""

/** Step names as table headings: two lines, broken between words */
export const PHASE_HEADINGS: Record<string, string> = {
  "kick-off": "Kick-off",
  "first-draft": "First Draft",
  "first-draft-elearning": "First Draft\ne-learning",
  "final-approval": "Final\nApproval",
  "final-elearning": "Final\ne-learning",
  "internal-training": "Internal\nTraining",
}

/** Grid shared by the column headings and every row */
export const TIMELINE_GRID = "grid grid-cols-[300px_repeat(6,minmax(0,1fr))_140px]"
export const TIMELINE_GRID_COMPACT =
  "grid grid-cols-[300px_repeat(6,minmax(0,1fr))_120px]"

/**
 * Where a project stands: the phase the team marked as Current (the isElearningIcon flag),
 * else the first open phase. A finished project has no current phase.
 */
export function getProgress(product: ProductItem, timelineType: TimelineType) {
  const phases =
    timelineType === "enhancement" ? ENHANCEMENT_PHASES : PRODUCT_PHASES
  const used = phases
    .map((p, i) => (product.milestones[p.key] ? i : -1))
    .filter((i) => i >= 0)
  const isFinished = checkIsProjectCompleted(product)
  const marked = phases
    .map((p) => Boolean(product.milestones[p.key]?.isElearningIcon))
    .lastIndexOf(true)
  const firstOpen =
    used.find(
      (i) => product.milestones[phases[i].key]?.status !== "completed"
    ) ?? -1
  const current = isFinished ? -1 : marked >= 0 ? marked : firstOpen
  return {
    phases,
    used,
    current,
    isFinished,
    first: used[0] ?? 0,
    last: used[used.length - 1] ?? 0,
  }
}

type StepKind = "done" | "now" | "todo" | "skip"

/** What each step shows: done, current, upcoming or skipped */
export function stepKinds(product: ProductItem, timelineType: TimelineType) {
  const { phases, current, isFinished, last } = getProgress(
    product,
    timelineType
  )
  const kinds: StepKind[] = phases.map((phase, i) => {
    const m = product.milestones[phase.key]
    if (isFinished || current < 0) return m ? "done" : "skip"
    if (i === current) return "now"
    if (i < current) return m ? "done" : "skip"
    return "todo"
  })
  // The line runs from the first step to the last one that matters
  const end = isFinished || current < 0 ? last : phases.length - 1
  const reach = isFinished || current < 0 ? last : current
  return { phases, kinds, current, isFinished, end, reach }
}

/** "20 Nov" -> { mon: "NOV", day: "20" } */
function launchParts(text: string) {
  const m = text.match(/^(\d{1,2})\s+([A-Za-z]{3})/)
  return m ? { day: m[1], mon: m[2].toUpperCase() } : null
}

export function TimelineRow({
  product,
  timelineType = "product",
  isAdmin = false,
  onEdit,
  onDelete,
  onPause,
  onResume,
  compact = false,
}: TimelineRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [isExportingThis, setIsExportingThis] = useState(false)
  const { phases, kinds, current, isFinished, end, reach } = stepKinds(
    product,
    timelineType
  )
  const first = kinds.findIndex((k) => k !== "skip")

  const handleExportRow = async () => {
    if (!rowRef.current) return
    try {
      setIsExportingThis(true)
      await new Promise((resolve) => setTimeout(resolve, 60))
      const dataUrl = await toPng(rowRef.current, {
        cacheBust: true,
        backgroundColor: "#FFFFFF",
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            node.classList.contains("export-hide")
          ),
      })
      const link = document.createElement("a")
      link.download = `timeline-${product.name.replace(/[^a-zA-Z0-9ก-๙]/g, "_").slice(0, 30)}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Failed to export row image", err)
    } finally {
      setIsExportingThis(false)
    }
  }

  const launchText = product.customRightLabel
    ? formatShortDate(product.customRightLabel)
    : formatShortDate(product.commercialDate) || "TBC"
  const parts = product.customRightLabel ? null : launchParts(launchText)
  const launchHead = !parts ? "#A8A29E" : isFinished ? "#1C1917" : "#ED1B2E"
  const launchLine = !parts ? "#E7E5E4" : isFinished ? "#D6D3D1" : "#F8B4BB"

  const actionButton =
    "touch-target inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"

  return (
    <div
      ref={rowRef}
      // Focusable by tap/click so touch screens can reveal the row actions (no hover there)
      tabIndex={-1}
      className={`group relative ${compact ? TIMELINE_GRID_COMPACT : TIMELINE_GRID} items-center border-b border-surface bg-white outline-none ${
        product.isPaused ? "opacity-60" : ""
      }`}
    >
      <div className="export-hide pointer-events-none absolute top-2 right-3 z-30 flex items-center gap-0.5 rounded-full bg-white p-0.5 opacity-0 shadow-[var(--shadow-card)] transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        {isAdmin && (
          <button type="button" onClick={() => onEdit(product)} className={actionButton} aria-label="Edit project" title="Edit">
            <Icon name="edit" size={17} />
          </button>
        )}
        <button
          type="button"
          onClick={handleExportRow}
          disabled={isExportingThis}
          className={actionButton}
          aria-label="Save this row as an image"
          title="Save this row as an image"
        >
          <Icon name="download" size={17} />
        </button>
        {isAdmin &&
          (product.isPaused ? (
            <button type="button" onClick={() => onResume(product)} className={actionButton} aria-label="Resume project" title="Resume">
              <Icon name="refresh" size={17} />
            </button>
          ) : (
            <button type="button" onClick={() => onPause(product)} className={actionButton} aria-label="Put project on hold" title="On hold">
              <Icon name="onHold" size={17} />
            </button>
          ))}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(product)}
            className={`${actionButton} hover:text-brand-ink`}
            aria-label="Delete project"
            title="Delete"
          >
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>

      {/* Project */}
      <div className={`flex min-w-0 flex-col gap-1.5 ${compact ? "py-2.5 pr-3 pl-5" : "py-4 pr-4 pl-6"}`}>
        <span
          className={`line-clamp-2 leading-snug font-semibold text-ink ${compact ? "text-lg" : "text-[15px]"}`}
          title={product.name}
        >
          {product.name}
        </span>
        <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-ink-soft ${compact ? "text-sm" : "text-xs"}`}>
          <b className="font-semibold text-ink">{product.broker}</b>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Icon name="user" size={13} />
            <span className="truncate">{product.owner}</span>
          </span>
          {product.isPaused && (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-400 px-2 py-0.5 font-semibold text-ink">
              <Icon name="onHold" size={12} />
              On hold
            </span>
          )}
        </span>
      </div>

      {/* Steps */}
      {phases.map((phase, i) => {
        const k = kinds[i]
        const milestone = product.milestones[phase.key]
        const segLeft = i > first && i <= end && first >= 0
        const segRight = i >= first && i < end && first >= 0
        const icon = PHASE_ICONS[phase.key]
        const label = `${PHASE_HEADINGS[phase.key].replace("\n", " ")}: ${
          { done: "Completed", now: "Current", todo: "Upcoming", skip: "Skipped" }[k]
        }`
        return (
          <div key={phase.key} className={`relative flex flex-col items-center gap-1.5 ${compact ? "py-3" : "py-4"}`}>
            <div className="relative flex h-9 w-full items-center justify-center">
              {segLeft && (
                <span
                  className={`absolute top-[16px] left-0 h-[3px] w-1/2 ${i <= reach ? "bg-done" : "bg-rule"}`}
                />
              )}
              {segRight && (
                <span
                  className={`absolute top-[16px] right-0 h-[3px] w-1/2 ${i + 1 <= reach ? "bg-done" : "bg-rule"}`}
                />
              )}
              {k === "done" && (
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-done text-white" title={label}>
                  <Icon name="check" size={14} strokeWidth={3} label={label} />
                </span>
              )}
              {k === "now" && (
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-pru-red text-white shadow-[0_0_0_5px_#FFE1E4]" title={label}>
                  <Icon name={icon} size={18} strokeWidth={2} label={label} />
                </span>
              )}
              {k === "todo" && (
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-stone-300 bg-white text-stone-400" title={label}>
                  <Icon name={icon} size={14} label={label} />
                </span>
              )}
              {/* A skipped step is not part of this project: no marker, the line runs straight through */}
              {k === "skip" && <span className="sr-only">{label}</span>}
            </div>
            <span
              className={`min-h-4 whitespace-nowrap ${compact ? "text-sm" : "text-xs"} ${k === "now" ? "font-bold text-brand-ink" : "text-ink-soft"}`}
            >
              {milestone?.date ? formatShortDate(milestone.date) : ""}
              {k === "now" && milestone?.date ? " · Current" : ""}
            </span>
            {phase.key === "internal-training" && product.csDate && (
              <span className="text-[11px] whitespace-nowrap text-ink-soft">
                CS {formatShortDate(product.csDate)}
              </span>
            )}
          </div>
        )
      })}

      {/* Target launch */}
      <div className={`flex flex-col items-end gap-1 ${compact ? "pr-4" : "pr-5"}`}>
        {/* Same size whether the date is set or TBC */}
        <span
          className={`inline-flex flex-col items-center overflow-hidden rounded-xl border bg-white ${compact ? "w-[80px]" : "w-[72px]"}`}
          style={{ borderColor: launchLine }}
        >
          <span className={`w-full py-px text-center font-bold text-white ${compact ? "text-xs" : "text-[10px]"}`} style={{ background: launchHead }}>
            {parts ? parts.mon : "LAUNCH"}
          </span>
          <span
            className={`flex w-full items-center justify-center truncate px-1 leading-tight font-bold ${compact ? "h-[34px]" : "h-[30px]"} ${
              parts ? `text-ink ${compact ? "text-[24px]" : "text-[22px]"}` : `text-ink-soft ${launchText.length > 4 ? "text-xs" : compact ? "text-xl" : "text-lg"}`
            }`}
            title={launchText}
          >
            {parts ? parts.day : launchText}
          </span>
        </span>
        {!product.customRightLabel && (
          <span className={`text-ink-soft ${compact ? "text-[13px]" : "text-[11px]"}`}>
            Internal {formatShortDate(product.internalDate) || "TBC"}
          </span>
        )}
        {current >= 0 && (
          <span className="sr-only">Current step {PHASE_HEADINGS[phases[current].key]}</span>
        )}
      </div>
    </div>
  )
}

/** Band above each partner's rows */
export function PartnerGroupHeader({
  partner,
  count,
  done,
  compact = false,
}: {
  partner: Partner
  count: number
  done: number
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-surface ${compact ? "px-5 py-2" : "px-6 py-3"}`}
      style={{ background: tintOf(partner.color) }}
    >
      <span
        className={`inline-flex items-center justify-center rounded-lg text-white ${compact ? "h-7 w-7" : "h-[30px] w-[30px]"}`}
        style={{ background: partner.color }}
      >
        <Icon name="partner" size={compact ? 13 : 16} />
      </span>
      <b className={compact ? "text-lg" : "text-base"} style={{ color: inkOf(partner.color) }}>
        {partner.name}
      </b>
      <span className={`text-ink-soft ${compact ? "text-[15px]" : "text-[13px]"}`}>
        {count} projects · {done} completed
      </span>
    </div>
  )
}

/** Key under the table and in the LINE image */
export function TimelineLegend({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-ink-soft ${large ? "px-5 text-[15px]" : "px-6 text-[13px]"}`}>
      <span className="inline-flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-done text-white">
          <Icon name="check" size={11} strokeWidth={3.4} />
        </span>
        Completed
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pru-red text-white">
          <Icon name="kickoff" size={11} strokeWidth={2.4} />
        </span>
        Current (icon of that step)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-5 w-5 rounded-full border-[1.5px] border-stone-300" />
        Upcoming
      </span>
    </div>
  )
}
