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
 * Where a project stands: the phase the team marked as "ตอนนี้" (the isElearningIcon flag),
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
  const { phases, used, current, isFinished, first, last } = getProgress(
    product,
    timelineType
  )
  // The red line runs up to the current phase (or the last one when nothing is open)
  const doneEnd = current >= 0 ? current : last
  const hasLine = used.length > 1

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
      className={`group relative grid grid-cols-[280px_1fr_150px] items-stretch border-b-2 border-rule bg-white px-6 outline-none ${
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
      <div className="flex min-w-0 flex-col gap-1.5 py-5 pr-6">
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
        </div>
        {product.isPaused ? (
          <span className="inline-flex items-center gap-1.5 self-start border-2 border-dashed border-gray-400 px-2 py-0.5 text-[13px] font-bold text-ink">
            <PruIcon name="pause" size={14} strokeWidth={4} />
            หยุดชั่วคราว
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1.5 self-start bg-ink px-2.5 py-0.5 text-[13px] font-bold text-white">
            <PruIcon name="check" size={14} strokeWidth={5} />
            ส่งมอบครบทุกขั้น
          </span>
        ) : current >= 0 ? (
          <span className="inline-flex max-w-full items-center gap-1.5 self-start bg-pru-red-soft px-2.5 py-0.5 text-[13px] font-bold text-brand-ink">
            <PruIcon
              name="pin"
              size={14}
              strokeWidth={4}
              className="shrink-0"
            />
            <span className="truncate">
              ตอนนี้: {phases[current].label.replace(/\n/g, " ")}
            </span>
          </span>
        ) : null}
      </div>

      {/* Progress: one column per phase, red line through finished phases, dashed after "ตอนนี้" */}
      <div className="grid grid-cols-6">
        {phases.map((phase, i) => {
          const milestone = product.milestones[phase.key]
          const shaded = i % 2 === 1
          const segLeft = hasLine && i - 1 >= first && i <= last
          const segRight = hasLine && i >= first && i + 1 <= last
          const isCurrent = Boolean(milestone) && i === current
          const isDone =
            Boolean(milestone) &&
            !isCurrent &&
            (current < 0 || i < current || milestone?.status === "completed")
          return (
            <div
              key={phase.key}
              className={`flex flex-col items-center py-5 ${shaded ? "bg-shade" : ""}`}
            >
              <div className="relative flex h-11 w-full items-center justify-center">
                {segLeft &&
                  (i <= doneEnd ? (
                    <span className="absolute top-5 left-0 h-1 w-1/2 bg-pru-red" />
                  ) : (
                    <span className="absolute top-[21px] left-0 w-1/2 border-t-2 border-dashed border-gray-400" />
                  ))}
                {segRight &&
                  (i + 1 <= doneEnd ? (
                    <span className="absolute top-5 right-0 h-1 w-1/2 bg-pru-red" />
                  ) : (
                    <span className="absolute top-[21px] right-0 w-1/2 border-t-2 border-dashed border-gray-400" />
                  ))}
                {milestone &&
                  (isCurrent ? (
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-pru-red bg-white ring-[5px] ring-pru-red-soft">
                      <PruIcon
                        name="pin"
                        size={24}
                        className="text-pru-red"
                        label="ตอนนี้"
                      />
                    </span>
                  ) : isDone ? (
                    <span
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-pru-red ring-4 ${shaded ? "ring-shade" : "ring-white"}`}
                    >
                      <PruIcon
                        name="check"
                        size={18}
                        strokeWidth={5}
                        className="text-white"
                        label="เสร็จแล้ว"
                      />
                    </span>
                  ) : (
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-400 bg-white text-[13px] font-bold text-ink-soft">
                      {i + 1}
                      <span className="sr-only"> ยังไม่ถึง</span>
                    </span>
                  ))}
              </div>
              {milestone?.date && (
                <span
                  className={`mt-2 whitespace-nowrap ${isCurrent ? "text-sm font-bold text-brand-ink" : "text-xs text-ink-soft"}`}
                >
                  {formatShortDate(milestone.date)}
                </span>
              )}
              {isCurrent && (
                <span className="mt-1 bg-pru-red-soft px-2 text-xs font-bold text-brand-ink">
                  ตอนนี้
                </span>
              )}
              {phase.key === "internal-training" && product.csDate && (
                <span className="text-xs whitespace-nowrap text-ink-soft">
                  CS {formatShortDate(product.csDate)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Target launch */}
      <div className="flex flex-col justify-center gap-0.5 bg-pru-red-soft px-4 py-5 text-right">
        {product.customRightLabel ? (
          <div className="text-sm leading-snug font-bold text-brand-ink">
            {formatShortDate(product.customRightLabel)}
          </div>
        ) : (
          <>
            <div className="text-xl leading-tight font-bold text-brand-ink">
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
      className={`flex flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3 ${text} text-ink-soft`}
    >
      <span className="inline-flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pru-red">
          <PruIcon
            name="check"
            size={14}
            strokeWidth={5}
            className="text-white"
          />
        </span>
        เสร็จแล้ว
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-pru-red bg-white">
          <PruIcon
            name="pin"
            size={16}
            strokeWidth={4}
            className="text-pru-red"
          />
        </span>
        ตอนนี้ (อัปเดตล่าสุด)
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-400 bg-white text-[11px] font-bold">
          4
        </span>
        ยังไม่ถึง (เลขตามลำดับขั้น)
      </span>
    </div>
  )
}
