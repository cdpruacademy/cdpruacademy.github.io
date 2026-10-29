"use client"

import * as React from "react"
import { useState } from "react"
import {
  TimelineType,
  PRODUCT_PHASES,
  ENHANCEMENT_PHASES,
  getMonthStatus,
  getSystemCurrentMonth,
  parseMonthYear,
  getMonthsForYear,
} from "@/lib/timeline-data"
import { Loader2 } from "lucide-react"
import { CloudStatusBadge } from "./cloud-status-badge"
import { Icon, PHASE_ICONS, type IconName } from "@/components/icon"
import { cardButton, cardButtonDark } from "@/components/page-hero"
import { PickMenu } from "@/components/ui/pick-menu"
import { PHASE_HEADINGS, TIMELINE_GRID, TIMELINE_GRID_COMPACT } from "./timeline-row"

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
]

export const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** "OCT 2026" -> "ตุลาคม 2026" */
export function thaiMonthLabel(monthKey: string): string {
  const parsed = parseMonthYear(monthKey)
  return parsed ? `${THAI_MONTHS[parsed.monthIndex]} ${parsed.year}` : monthKey
}

/** "OCT 2026" -> "October 2026" */
export function monthLabel(monthKey: string): string {
  const parsed = parseMonthYear(monthKey)
  return parsed ? `${EN_MONTHS[parsed.monthIndex]} ${parsed.year}` : monthKey
}

interface TimelineHeroProps {
  timelineType: TimelineType
  onTimelineTypeChange: (type: TimelineType) => void
  selectedMonth: string
  onMonthChange: (month: string) => void
  selectedYear?: number
  onYearChange?: (year: number) => void
  availableYears?: number[]
  onGoToCurrentMonth?: () => void
  asOfText: string
  onAsOfChange: (asOf: string) => void
  counts?: { total: number; completed: number; inProgress: number; onHold: number }
  onAddClick: () => void
  onExportAllClick: () => void
  onSendLineClick?: () => void
  isSendingLine?: boolean
  isExporting?: boolean
  isAdmin?: boolean
  isCloudConnected?: boolean
  isSyncing?: boolean
}

/** "NEW PRODUCT" or "ENHANCEMENT" in a white pill, so the two timelines are told apart at a glance */
export function TimelineTypeBadge({
  timelineType,
  large = false,
  soft = false,
}: {
  timelineType: TimelineType
  large?: boolean
  /** On white: a tinted pill instead of a white one */
  soft?: boolean
}) {
  const isEnhancement = timelineType === "enhancement"
  const bg = soft ? (isEnhancement ? "bg-enh-soft" : "bg-pru-red-soft") : "bg-white"
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full font-bold tracking-[0.06em] ${bg} ${
        isEnhancement ? "text-enh" : "text-brand-ink"
      } ${large ? "h-11 pr-5 pl-3.5 text-lg" : soft ? "h-8 pr-3.5 pl-2.5 text-[13px]" : "h-9 pr-4 pl-3 text-sm"}`}
    >
      <Icon name={isEnhancement ? "wrench" : "product"} size={large ? 22 : 18} strokeWidth={2} />
      {isEnhancement ? "ENHANCEMENT" : "NEW PRODUCT"}
    </span>
  )
}

const TYPE_OPTIONS = [
  { value: "product", label: "New Product", icon: "product" },
  { value: "enhancement", label: "Enhancement", icon: "wrench" },
] as const

/** Top of the Timeline page: controls, then one summary card (number, statuses, partner mix) */
export function TimelineHero({
  timelineType,
  onTimelineTypeChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  availableYears,
  onGoToCurrentMonth,
  asOfText,
  onAsOfChange,
  counts,
  onAddClick,
  onExportAllClick,
  onSendLineClick,
  isSendingLine = false,
  isExporting = false,
  isAdmin = false,
  isCloudConnected = false,
  isSyncing = false,
}: TimelineHeroProps) {
  const [isEditingAsOf, setIsEditingAsOf] = useState(false)
  const [tempAsOf, setTempAsOf] = useState(asOfText)
  // Phone-only bottom sheets: the "more" menu and the month/year picker
  const [sheet, setSheet] = useState<null | "more" | "month">(null)
  const [pickerYear, setPickerYear] = useState(0)

  const systemMonth = getSystemCurrentMonth()
  const activeYear =
    selectedYear || parseMonthYear(selectedMonth)?.year || new Date().getFullYear()
  const yearsList =
    availableYears && availableYears.length > 0
      ? availableYears
      : [activeYear - 1, activeYear, activeYear + 1]
  const displayMonths = getMonthsForYear(activeYear)
  const currentIndex = displayMonths.indexOf(selectedMonth)

  const goToCurrent = () =>
    onGoToCurrentMonth ? onGoToCurrentMonth() : onMonthChange(systemMonth)

  const handleSaveAsOf = () => {
    if (tempAsOf.trim()) onAsOfChange(tempAsOf.trim())
    setIsEditingAsOf(false)
  }

  // New Product is red, Enhancement is blue
  const typeColor = timelineType === "enhancement" ? "#1E4FA3" : "#ED1B2E"

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Phone controls: type, one month button and a "more" menu; Add project floats above the tab bar */}
      <div className="flex flex-col gap-3 md:hidden">
        <div role="tablist" aria-label="Timeline type" className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-rule)]">
          {(
            [
              { value: "product", label: "New Product" },
              { value: "enhancement", label: "Enhancement" },
            ] as const
          ).map((o) => {
            const on = o.value === timelineType
            return (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTimelineTypeChange(o.value)}
                className={`touch-target h-[34px] rounded-full text-sm font-semibold ${on ? `${o.value === "enhancement" ? "bg-enh" : "bg-pru-red"} text-white` : "text-ink"}`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-11 flex-1 items-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-rule)]">
            <button
              type="button"
              onClick={() => currentIndex > 0 && onMonthChange(displayMonths[currentIndex - 1])}
              disabled={currentIndex <= 0}
              aria-label="Previous month"
              className="touch-target flex h-11 w-11 items-center justify-center text-ink disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => {
                setPickerYear(activeYear)
                setSheet("month")
              }}
              aria-haspopup="dialog"
              className="touch-target inline-flex h-11 flex-1 items-center justify-center gap-1.5 text-base font-bold text-ink"
            >
              {monthLabel(selectedMonth)}
              <Icon name="chevronDown" size={14} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() =>
                currentIndex < displayMonths.length - 1 && onMonthChange(displayMonths[currentIndex + 1])
              }
              disabled={currentIndex >= displayMonths.length - 1}
              aria-label="Next month"
              className="touch-target flex h-11 w-11 items-center justify-center text-ink disabled:opacity-40"
            >
              <Icon name="chevronRight" size={18} strokeWidth={2.2} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-label="More"
            aria-haspopup="dialog"
            className={`touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rule ${sheet === "more" ? "bg-ink text-white" : "bg-white text-ink"}`}
          >
            <Icon name="more" size={20} strokeWidth={3} />
          </button>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onAddClick}
            className="touch-target fixed right-4 bottom-20 z-30 inline-flex h-[52px] items-center gap-2 rounded-full bg-pru-red pr-5 pl-4 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(237,27,46,0.7)]"
          >
            <Icon name="plus" size={20} strokeWidth={2.4} />
            Add project
          </button>
        )}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-in bg-ink/40 fade-in" onClick={() => setSheet(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "more" ? "More" : "เลือกเดือน"}
            className="absolute inset-x-0 bottom-0 animate-in rounded-t-[28px] bg-white px-5 pt-2.5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-ink duration-200 slide-in-from-bottom"
          >
            <span className="mx-auto mb-3.5 block h-[5px] w-10 rounded-full bg-stone-300" />
            {sheet === "more" ? (
              <>
                <p className="mb-2 text-[13px] font-semibold text-ink-soft">
                  {monthLabel(selectedMonth)} · {timelineType === "enhancement" ? "Enhancement" : "New Product"}
                </p>
                {(
                  [
                    onSendLineClick && {
                      icon: "send",
                      label: isSendingLine ? "Sending…" : "Send to LINE",
                      hint: "ส่งรูป Timeline เดือนนี้เข้ากลุ่ม",
                      onClick: onSendLineClick,
                      disabled: isSendingLine,
                    },
                    {
                      icon: "download",
                      label: isExporting ? "Saving…" : "Save image",
                      hint: "รูปเดียวกับที่ส่ง LINE",
                      onClick: onExportAllClick,
                      disabled: isExporting,
                    },
                    selectedMonth !== systemMonth && {
                      icon: "calendar",
                      label: "Go to this month",
                      onClick: goToCurrent,
                      quiet: true,
                    },
                  ].filter(Boolean) as {
                    icon: IconName
                    label: string
                    hint?: string
                    onClick: () => void
                    disabled?: boolean
                    quiet?: boolean
                  }[]
                ).map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setSheet(null)
                      item.onClick()
                    }}
                    className="flex w-full items-center gap-3.5 px-1 py-2.5 text-left disabled:opacity-50"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${item.quiet ? "bg-surface text-stone-700" : "bg-pru-red-soft text-brand-ink"}`}
                    >
                      <Icon name={item.icon} size={20} strokeWidth={1.9} />
                    </span>
                    <span>
                      <b className="text-base">{item.label}</b>
                      {item.hint && <span className="block text-[13px] text-ink-soft">{item.hint}</span>}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className={`${cardButton} mt-3 h-12 w-full justify-center text-[15px]`}
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <>
                <div className="mb-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    disabled={!yearsList.includes(pickerYear - 1)}
                    aria-label="Previous year"
                    className="touch-target flex h-11 w-11 items-center justify-center rounded-full border border-rule disabled:opacity-30"
                  >
                    <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
                  </button>
                  <span className="text-center">
                    <b className="text-[22px] tabular-nums">{pickerYear}</b>
                    <span className="block text-xs text-ink-soft">พ.ศ. {pickerYear + 543}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    disabled={!yearsList.includes(pickerYear + 1)}
                    aria-label="Next year"
                    className="touch-target flex h-11 w-11 items-center justify-center rounded-full border border-rule disabled:opacity-30"
                  >
                    <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {getMonthsForYear(pickerYear).map((m) => {
                    const on = m === selectedMonth
                    const isNow = m === systemMonth
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          if (pickerYear !== activeYear) onYearChange?.(pickerYear)
                          onMonthChange(m)
                          setSheet(null)
                        }}
                        className={`relative h-[52px] rounded-2xl border-[1.5px] text-[15px] font-semibold ${
                          on ? "border-pru-red bg-pru-red text-white" : "border-rule bg-white text-ink"
                        }`}
                      >
                        {monthLabel(m).split(" ")[0].slice(0, 3)}
                        {isNow && (
                          <span
                            className={`absolute bottom-1.5 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full ${on ? "bg-white" : "bg-pru-red"}`}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-pru-red" />
                  This month
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls (tablet and desktop) */}
      <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-[32px] leading-tight font-bold">Timeline</h1>
          <div role="tablist" aria-label="Timeline type" className="inline-flex gap-1 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-rule)]">
            {TYPE_OPTIONS.map((o) => {
              const on = o.value === timelineType
              return (
                <button
                  key={o.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onTimelineTypeChange(o.value)}
                  className={`touch-target inline-flex h-10 items-center gap-2 rounded-full px-[18px] text-[15px] font-bold transition-colors ${
                    on ? `${o.value === "enhancement" ? "bg-enh" : "bg-pru-red"} text-white` : "text-ink hover:bg-surface"
                  }`}
                >
                  <Icon name={o.icon} size={18} />
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-10 items-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-rule)]">
            <button
              type="button"
              onClick={() => currentIndex > 0 && onMonthChange(displayMonths[currentIndex - 1])}
              disabled={currentIndex <= 0}
              aria-label="Previous month"
              className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} strokeWidth={2} />
            </button>
            <PickMenu
              label="Month"
              value={currentIndex >= 0 ? selectedMonth : undefined}
              placeholder={monthLabel(selectedMonth)}
              onChange={onMonthChange}
              options={displayMonths.map((m) => ({
                value: m,
                label: monthLabel(m),
                note: getMonthStatus(m) === "current" ? "This month" : undefined,
              }))}
              className="h-10 rounded-full px-1.5 text-[15px] font-bold text-ink hover:bg-surface"
            />
            <button
              type="button"
              onClick={() =>
                currentIndex < displayMonths.length - 1 && onMonthChange(displayMonths[currentIndex + 1])
              }
              disabled={currentIndex >= displayMonths.length - 1}
              aria-label="Next month"
              className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface disabled:opacity-40"
            >
              <Icon name="chevronRight" size={18} strokeWidth={2} />
            </button>
          </span>
          {onYearChange && (
            <PickMenu
              label="Year"
              value={String(activeYear)}
              onChange={(v) => onYearChange(parseInt(v, 10))}
              options={yearsList.map((y) => ({ value: String(y), label: `${y} (พ.ศ. ${y + 543})` }))}
              className="h-10 rounded-full border border-rule bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
            />
          )}
          {selectedMonth !== systemMonth && (
            <button type="button" onClick={goToCurrent} className="touch-target h-10 px-2 text-sm font-semibold text-ink underline underline-offset-4">
              This month
            </button>
          )}
          <button type="button" onClick={onExportAllClick} disabled={isExporting} className={cardButton}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
            {isExporting ? "Saving…" : "Save image"}
          </button>
          {onSendLineClick && (
            <button type="button" onClick={onSendLineClick} disabled={isSendingLine} className={cardButtonDark}>
              {isSendingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={18} />}
              {isSendingLine ? "Sending…" : "Send to LINE"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={onAddClick}
              className="touch-target inline-flex h-10 items-center gap-2 rounded-full bg-pru-red px-4 text-sm font-bold whitespace-nowrap text-white transition hover:brightness-95"
            >
              <Icon name="plus" size={18} strokeWidth={2.2} />
              Add project
            </button>
          )}
        </div>
      </div>

      {/* Summary: one card filled with the tab's colour (red New Product, blue Enhancement) */}
      <section
        className="flex flex-col gap-5 rounded-[24px] px-5 py-5 text-white sm:px-8 sm:py-7 lg:flex-row lg:items-end lg:justify-between"
        style={{ backgroundColor: typeColor }}
      >
        <div className="flex flex-col gap-3">
          <TimelineTypeBadge timelineType={timelineType} />
          <div className="flex items-end gap-4">
            <span className="text-[64px] leading-[0.82] font-bold tracking-[-0.04em] tabular-nums sm:text-[104px]">
              {counts?.total ?? "–"}
            </span>
            <span className="pb-1 text-xl leading-tight font-bold sm:text-[28px]">
              Projects
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm font-medium sm:text-[15px]">
                {isEditingAsOf ? (
                  <span className="export-hide inline-flex items-center gap-2">
                    <label htmlFor="as-of-input" className="sr-only">Last updated</label>
                    <input
                      id="as-of-input"
                      type="text"
                      value={tempAsOf}
                      autoFocus
                      onChange={(e) => setTempAsOf(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveAsOf()
                        if (e.key === "Escape") setIsEditingAsOf(false)
                      }}
                      placeholder="as of 31 Aug"
                      className="h-9 w-40 rounded-lg bg-white px-2 text-sm text-ink"
                    />
                    <button type="button" onClick={handleSaveAsOf} className="h-9 touch-target rounded-lg bg-ink px-3 text-sm font-bold text-white">
                      Save
                    </button>
                  </span>
                ) : isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTempAsOf(asOfText)
                      setIsEditingAsOf(true)
                    }}
                    title="Edit the date of this data"
                    className="underline decoration-dotted underline-offset-4"
                  >
                    {monthLabel(selectedMonth)} · {asOfText}
                  </button>
                ) : (
                  <span>{monthLabel(selectedMonth)} · {asOfText}</span>
                )}
                <span className="export-hide">
                  <CloudStatusBadge isCloudConnected={isCloudConnected} isSyncing={isSyncing} />
                </span>
              </span>
            </span>
          </div>
        </div>

        {counts && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[540px]">
            {(
              [
                { n: counts.inProgress, label: "In progress", icon: "inProgress" },
                { n: counts.completed, label: "Completed", icon: "completed" },
                { n: counts.onHold, label: "On hold", icon: "onHold" },
              ] as const
            ).map((s) => (
              <span key={s.label} className="flex flex-col gap-1 rounded-[18px] bg-white/15 px-3 py-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] sm:px-4 sm:py-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap sm:text-sm">
                  <Icon name={s.icon} size={18} strokeWidth={2} className="hidden shrink-0 sm:block" />
                  {s.label}
                </span>
                <b className="text-[28px] leading-none tabular-nums sm:text-[36px]">{s.n}</b>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * Column headings shared by the page table and the LINE image: one rounded box per step.
 * Steps share one quiet colour; Internal Training is red and Target Launch is green.
 */
export function TimelineTrackHeader({
  timelineType,
  compact = false,
}: {
  timelineType: TimelineType
  compact?: boolean
}) {
  const phases = timelineType === "enhancement" ? ENHANCEMENT_PHASES : PRODUCT_PHASES
  const box = `flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 text-center ${compact ? "py-2.5" : "py-3"}`
  const label = `leading-tight font-bold whitespace-pre-line ${compact ? "text-[15px]" : "text-[13px]"}`
  return (
    <div className={`${compact ? TIMELINE_GRID_COMPACT : TIMELINE_GRID} border-b border-rule py-3`}>
      <div className={`flex items-end ${compact ? "pl-5" : "pl-6"}`}>
        <span className={`font-bold ${compact ? "text-[15px]" : "text-[13px]"}`}>Project</span>
      </div>
      {phases.map((phase, i) => {
        const isTraining = phase.key === "internal-training"
        return (
          <div key={phase.key} className="px-1">
            <div className={`${box} ${isTraining ? "bg-pru-red text-white" : "bg-[#efedeb] text-ink"}`}>
              <Icon name={PHASE_ICONS[phase.key]} size={compact ? 18 : 17} strokeWidth={1.9} />
              <span className={label}>
                {i + 1} · {PHASE_HEADINGS[phase.key]}
              </span>
            </div>
          </div>
        )
      })}
      <div className={compact ? "pr-4 pl-1" : "pr-5 pl-1"}>
        <div className={`${box} bg-done text-white`}>
          <Icon name="launch" size={compact ? 18 : 17} strokeWidth={1.9} />
          <span className={label}>{"Target\nLaunch"}</span>
        </div>
      </div>
    </div>
  )
}
