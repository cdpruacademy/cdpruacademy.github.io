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
import {
  HeroSegment,
  card,
  cardButton,
  heroButton,
  heroButtonSolid,
} from "@/components/page-hero"
import { PHASE_HEADINGS, TIMELINE_GRID, TIMELINE_GRID_COMPACT } from "./timeline-row"
import { PartnerGroup, PartnerMix } from "./timeline-summary"

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
  groups: PartnerGroup[]
  onAddClick: () => void
  onExportAllClick: () => void
  onSendLineClick?: () => void
  isSendingLine?: boolean
  isExporting?: boolean
  isAdmin?: boolean
  isCloudConnected?: boolean
  isSyncing?: boolean
}

const heroSelect =
  "h-10 rounded-full border-[1.5px] border-white/55 bg-transparent px-4 text-sm font-semibold text-white [&>option]:text-ink"

/** The red band of the Timeline page: controls, the month's headline numbers and the partner mix */
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
  groups,
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

  const roundButton =
    "touch-target inline-flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-white/55 text-white hover:bg-white/15 disabled:opacity-40"

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Phone controls: type, one month button and a "more" menu; Add project floats above the tab bar */}
      <div className="flex flex-col gap-3 md:hidden">
        <div role="tablist" aria-label="Timeline type" className="grid grid-cols-2 gap-0.5 rounded-full bg-black/20 p-[3px]">
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
                className={`touch-target h-[34px] rounded-full text-sm font-semibold ${on ? "bg-white text-brand-ink" : "text-white"}`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-11 flex-1 items-center rounded-full bg-black/20">
            <button
              type="button"
              onClick={() => currentIndex > 0 && onMonthChange(displayMonths[currentIndex - 1])}
              disabled={currentIndex <= 0}
              aria-label="Previous month"
              className="touch-target flex h-11 w-11 items-center justify-center text-white disabled:opacity-40"
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
              className="touch-target inline-flex h-11 flex-1 items-center justify-center gap-1.5 text-base font-bold text-white"
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
              className="touch-target flex h-11 w-11 items-center justify-center text-white disabled:opacity-40"
            >
              <Icon name="chevronRight" size={18} strokeWidth={2.2} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-label="More"
            aria-haspopup="dialog"
            className={`touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/55 ${sheet === "more" ? "bg-white text-brand-ink" : "text-white"}`}
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
      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        <div className="flex flex-wrap items-center gap-2.5">
          <HeroSegment
            label="Timeline type"
            value={timelineType}
            onChange={onTimelineTypeChange}
            options={[
              { value: "product", label: "New Product" },
              { value: "enhancement", label: "Enhancement" },
            ]}
          />
          <button
            type="button"
            onClick={() => currentIndex > 0 && onMonthChange(displayMonths[currentIndex - 1])}
            disabled={currentIndex <= 0}
            aria-label="Previous month"
            className={roundButton}
          >
            <Icon name="chevronLeft" size={18} strokeWidth={2} />
          </button>
          <label className="inline-flex items-center">
            <span className="sr-only">Month</span>
            <select
              value={currentIndex >= 0 ? selectedMonth : ""}
              onChange={(e) => onMonthChange(e.target.value)}
              className={`${heroSelect} text-base font-bold`}
            >
              {displayMonths.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                  {getMonthStatus(m) === "current" ? " (this month)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              currentIndex < displayMonths.length - 1 &&
              onMonthChange(displayMonths[currentIndex + 1])
            }
            disabled={currentIndex >= displayMonths.length - 1}
            aria-label="Next month"
            className={roundButton}
          >
            <Icon name="chevronRight" size={18} strokeWidth={2} />
          </button>
          {onYearChange && (
            <label className="inline-flex items-center">
              <span className="sr-only">Year</span>
              <select
                value={activeYear}
                onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                className={heroSelect}
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y} (พ.ศ. {y + 543})
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedMonth !== systemMonth && (
            <button type="button" onClick={goToCurrent} className="touch-target h-10 px-2 text-sm font-semibold text-white underline underline-offset-4">
              This month
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onExportAllClick} disabled={isExporting} className={`${heroButton} hidden md:inline-flex`}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
            {isExporting ? "Saving…" : "Save image"}
          </button>
          {onSendLineClick && (
            <button type="button" onClick={onSendLineClick} disabled={isSendingLine} className={heroButton}>
              {isSendingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={18} />}
              {isSendingLine ? "Sending…" : "Send to LINE"}
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={onAddClick} className={heroButtonSolid}>
              <Icon name="plus" size={18} strokeWidth={2.2} />
              Add project
            </button>
          )}
        </div>
      </div>

      {/* Headline numbers and partner mix */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-4">
            <span className="text-[72px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[124px]">
              {counts?.total ?? "–"}
            </span>
            <span className="pb-1.5 text-2xl leading-tight font-bold sm:text-[30px]">
              Projects
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] font-medium">
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
                    Last updated · {asOfText}
                  </button>
                ) : (
                  <span>Last updated · {asOfText}</span>
                )}
                <span className="export-hide">
                  <CloudStatusBadge isCloudConnected={isCloudConnected} isSyncing={isSyncing} />
                </span>
              </span>
            </span>
          </div>
          {counts && (
            <p className="text-[15px] sm:hidden">
              {counts.completed} Completed · {counts.inProgress} In progress
              {counts.onHold > 0 && ` · ${counts.onHold} On hold`}
            </p>
          )}
          {counts && (
            <div className="hidden flex-wrap gap-2.5 sm:flex">
              <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 font-bold text-done">
                <Icon name="completed" size={22} strokeWidth={2} />
                {counts.completed} Completed
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 font-bold text-brand-ink">
                <Icon name="inProgress" size={22} strokeWidth={2} />
                {counts.inProgress} In progress
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1.5 pr-3.5 pl-2 font-semibold">
                <Icon name="onHold" size={22} strokeWidth={2} />
                {counts.onHold} On hold
              </span>
            </div>
          )}
        </div>
        {groups.length > 0 && (
          <div
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white p-0.5 sm:hidden"
            role="img"
            aria-label={groups.map((g) => `${g.partner.name} ${g.items.length}`).join(", ")}
          >
            {groups.map((g) => (
              <span
                key={g.partner.id}
                className="rounded-full"
                style={{ flex: g.items.length, backgroundColor: g.partner.color }}
              />
            ))}
          </div>
        )}
        {groups.length > 0 && (
          <div className={`${card} hidden p-5 text-ink sm:block`}>
            <b className="mb-3.5 block text-[15px]">Projects by partner</b>
            <PartnerMix groups={groups} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Column headings shared by the page table and the LINE image */
export function TimelineTrackHeader({
  timelineType,
  compact = false,
}: {
  timelineType: TimelineType
  compact?: boolean
}) {
  const phases = timelineType === "enhancement" ? ENHANCEMENT_PHASES : PRODUCT_PHASES
  const dot = compact ? "h-7 w-7" : "h-8 w-8"
  return (
    <div className={`${compact ? TIMELINE_GRID_COMPACT : TIMELINE_GRID} border-b-2 border-ink`}>
      <div className={`flex items-end ${compact ? "pb-2.5 pl-5" : "pb-3 pl-6"}`}>
        <span className="text-[13px] font-bold">Project</span>
      </div>
      {phases.map((phase, i) => (
        <div key={phase.key} className={`flex flex-col items-center gap-1.5 px-1 text-center ${compact ? "pt-3 pb-2.5" : "pt-4 pb-3"}`}>
          <span className={`flex ${dot} items-center justify-center rounded-full bg-ink text-white`}>
            <Icon name={PHASE_ICONS[phase.key]} size={compact ? 14 : 16} />
          </span>
          <span className="min-h-[33px] text-[13px] leading-tight font-bold whitespace-pre-line">
            <span className="text-gray-400">{i + 1} · </span>
            {PHASE_HEADINGS[phase.key]}
          </span>
        </div>
      ))}
      <div className={`flex flex-col items-center gap-1.5 text-center ${compact ? "pt-3 pb-2.5" : "pt-4 pb-3"}`}>
        <span className={`flex ${dot} items-center justify-center rounded-full bg-brand-ink text-white`}>
          <Icon name="launch" size={compact ? 14 : 16} />
        </span>
        <span className="min-h-[33px] text-[13px] leading-tight font-bold whitespace-pre-line text-brand-ink">
          {"Target\nLaunch"}
        </span>
      </div>
    </div>
  )
}
