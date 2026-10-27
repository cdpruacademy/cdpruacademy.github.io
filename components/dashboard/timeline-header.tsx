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
import { Icon, PHASE_ICONS } from "@/components/icon"
import {
  HeroSegment,
  card,
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
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <span className="text-[88px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[124px]">
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
            <div className="flex flex-wrap gap-2.5">
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
          <div className={`${card} p-5 text-ink`}>
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
