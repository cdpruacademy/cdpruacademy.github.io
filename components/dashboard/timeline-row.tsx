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
import { PruIcon } from "@/components/pru-icon"

interface TimelineRowProps {
  product: ProductItem
  timelineType?: TimelineType
  isAdmin?: boolean
  onEdit: (product: ProductItem) => void
  onDelete: (product: ProductItem) => void
  onPause: (product: ProductItem) => void
  onResume: (product: ProductItem) => void
  customColorMap?: Record<string, string>
}

// "19 May 2026" -> "19 May"; "TBC" stays
export const formatShortDate = (dateStr?: string): string =>
  dateStr ? dateStr.replace(/[, ]*\b(20\d{2}|25\d{2})\b/g, "").trim() : ""

/**
 * Where a project stands: the phase the team marked with the update marker (the old monitor
 * icon flag), else the first open phase. A finished project has no current phase.
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

const center = (i: number) => ((i + 0.5) / 6) * 100
// Width of the brand's "opening" in the line around the update marker, in % of the track
const OPENING = 3.2

export function TimelineRow({
  product,
  timelineType = "product",
  isAdmin = false,
  onEdit,
  onDelete,
  onPause,
  onResume,
}: TimelineRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [isExportingThis, setIsExportingThis] = useState(false)
  const { phases, used, current, first, last } = getProgress(
    product,
    timelineType
  )

  const doneEnd = current >= 0 ? current : last
  const doneLine =
    used.length > 1 && doneEnd > first
      ? {
          left: `${center(first)}%`,
          width: `${center(doneEnd) - center(first) - (current >= 0 ? OPENING : 0)}%`,
        }
      : null
  const todoLine =
    current >= 0 && last > current
      ? {
          left: `${center(current) + OPENING}%`,
          width: `${center(last) - center(current) - OPENING}%`,
        }
      : null

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

  const actionButton =
    "touch-target w-9 h-9 inline-flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface"

  return (
    <div
      ref={rowRef}
      // Focusable by tap/click so touch screens can reveal the row actions (no hover there)
      tabIndex={-1}
      className={`group relative grid grid-cols-[280px_1fr_140px] items-center gap-6 border-b-2 border-rule bg-white px-6 py-4 outline-none ${
        product.isPaused ? "opacity-60" : ""
      }`}
    >
      <div className="export-hide pointer-events-none absolute top-2 right-3 z-30 flex items-center gap-0.5 border-2 border-rule bg-white opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onEdit(product)}
            className={actionButton}
            title="แก้ไข"
            aria-label="แก้ไขข้อมูล"
          >
            <PruIcon name="document" size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={handleExportRow}
          disabled={isExportingThis}
          className={actionButton}
          title="บันทึกแถวนี้เป็นรูป"
          aria-label="บันทึกแถวนี้เป็นรูป"
        >
          <PruIcon name="send" size={18} />
        </button>
        {isAdmin &&
          (product.isPaused ? (
            <button
              type="button"
              onClick={() => onResume(product)}
              className={actionButton}
              title="ทำต่อ"
              aria-label="ทำต่อ"
            >
              <PruIcon name="clock" size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPause(product)}
              className={actionButton}
              title="หยุด project นี้ชั่วคราว"
              aria-label="หยุด project นี้ชั่วคราว"
            >
              <PruIcon name="pause" size={18} />
            </button>
          ))}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(product)}
            className={`${actionButton} hover:text-brand-ink`}
            title="ลบถาวร"
            aria-label="ลบถาวร"
          >
            <PruIcon name="warning" size={18} />
          </button>
        )}
      </div>

      {/* Project */}
      <div className="flex min-w-0 flex-col gap-1">
        <div
          className="line-clamp-2 text-base leading-snug font-bold text-ink"
          title={product.name}
        >
          {product.name}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <PruIcon name="board" size={14} strokeWidth={4} />
            {product.broker}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <PruIcon name="person" size={14} strokeWidth={4} />
            <span className="truncate">{product.owner}</span>
          </span>
          {product.isPaused && (
            <span className="inline-flex items-center gap-1 font-bold text-ink">
              <PruIcon name="pause" size={14} strokeWidth={4} />
              หยุดชั่วคราว
            </span>
          )}
        </div>
      </div>

      {/* Progress: red line up to an opening, the update marker, then dashed grey */}
      <div className="relative h-14">
        {doneLine && (
          <div
            className="absolute top-[15px] h-1 rounded-full bg-pru-red"
            style={doneLine}
          />
        )}
        {todoLine && (
          <div
            className="absolute top-[16px] h-0 border-t-2 border-dashed border-gray-400"
            style={todoLine}
          />
        )}
        <div className="absolute inset-0 grid grid-cols-6">
          {phases.map((phase, i) => {
            const milestone = product.milestones[phase.key]
            if (!milestone) return <div key={phase.key} />
            const isCurrent = i === current
            const isDone =
              !isCurrent &&
              (current < 0 || i < current || milestone.status === "completed")
            return (
              <div
                key={phase.key}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="flex h-[34px] items-center justify-center">
                  {isCurrent ? (
                    <span className="flex bg-white px-1" title="อัปเดตล่าสุด">
                      <PruIcon
                        name="pin"
                        size={30}
                        className="text-pru-red"
                        label="อัปเดตล่าสุด"
                      />
                    </span>
                  ) : isDone ? (
                    <span className="box-content h-3 w-3 rounded-full border-[3px] border-white bg-pru-red" />
                  ) : (
                    <span className="h-3 w-3 rounded-full border-2 border-gray-400 bg-white" />
                  )}
                </div>
                {milestone.date && (
                  <span
                    className={`text-xs whitespace-nowrap ${isCurrent ? "font-bold text-ink" : "text-ink-soft"}`}
                  >
                    {formatShortDate(milestone.date)}
                  </span>
                )}
                {phase.key === "internal-training" && product.csDate && (
                  <span className="text-xs whitespace-nowrap text-ink-soft">
                    {formatShortDate(product.csDate)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Target launch */}
      <div className="text-right">
        {product.customRightLabel ? (
          <div className="text-sm leading-snug font-bold text-ink">
            {formatShortDate(product.customRightLabel)}
          </div>
        ) : (
          <>
            <div className="text-lg leading-tight font-bold text-ink">
              {formatShortDate(product.commercialDate) || "TBC"}
            </div>
            <div className="text-xs text-ink-soft">
              Internal {formatShortDate(product.internalDate) || "TBC"}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Legend under the table and in the LINE image. */
export function TimelineLegend({ large = false }: { large?: boolean }) {
  const text = large ? "text-[15px]" : "text-[13px]"
  return (
    <div
      className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 ${text} text-ink-soft`}
    >
      <span className="inline-flex items-center gap-2">
        <span className="h-1 w-7 rounded-full bg-pru-red" /> ผ่านแล้ว
      </span>
      <span className="inline-flex items-center gap-2">
        <PruIcon
          name="pin"
          size={large ? 22 : 18}
          strokeWidth={4}
          className="text-pru-red"
        />{" "}
        อัปเดตล่าสุด (ขั้นปัจจุบัน)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="w-7 border-t-2 border-dashed border-gray-400" />{" "}
        ยังไม่ถึง
      </span>
    </div>
  )
}
