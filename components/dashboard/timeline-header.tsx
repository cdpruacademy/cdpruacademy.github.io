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
import { Eyebrow, PruIcon } from "@/components/pru-icon"

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

/** "OCT 2026" -> "ตุลาคม 2026" */
export function thaiMonthLabel(monthKey: string): string {
  const parsed = parseMonthYear(monthKey)
  return parsed ? `${THAI_MONTHS[parsed.monthIndex]} ${parsed.year}` : monthKey
}

interface TimelineHeaderProps {
  timelineType: TimelineType
  onTimelineTypeChange: (type: TimelineType) => void
  selectedMonth: string
  onMonthChange: (month: string) => void
  availableMonths?: string[]
  selectedYear?: number
  onYearChange?: (year: number) => void
  availableYears?: number[]
  onGoToCurrentMonth?: () => void
  asOfText: string
  onAsOfChange: (asOf: string) => void
  itemCount?: number
  onAddClick: () => void
  onExportAllClick: () => void
  onOpenColorModal: () => void
  onSendLineClick?: () => void
  isSendingLine?: boolean
  isExporting?: boolean
  isAdmin?: boolean
  isCloudConnected?: boolean
  isSyncing?: boolean
}

const outlineButton =
  "touch-target inline-flex items-center gap-2 h-11 px-4 border-2 border-rule bg-white text-[15px] font-bold text-ink hover:border-ink transition-colors disabled:opacity-50"

export function TimelineHeader({
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
  itemCount,
  onAddClick,
  onExportAllClick,
  onOpenColorModal,
  onSendLineClick,
  isSendingLine = false,
  isExporting = false,
  isAdmin = false,
  isCloudConnected = false,
  isSyncing = false,
}: TimelineHeaderProps) {
  const [isEditingAsOf, setIsEditingAsOf] = useState(false)
  const [tempAsOf, setTempAsOf] = useState(asOfText)

  const isEnhancement = timelineType === "enhancement"
  const systemMonth = getSystemCurrentMonth()
  const activeYear =
    selectedYear ||
    parseMonthYear(selectedMonth)?.year ||
    new Date().getFullYear()
  const yearsList =
    availableYears && availableYears.length > 0
      ? availableYears
      : [activeYear - 1, activeYear, activeYear + 1]
  const displayMonths = getMonthsForYear(activeYear)
  const currentIndex = displayMonths.indexOf(selectedMonth)
  const parsedSelected = parseMonthYear(selectedMonth)

  const goToCurrent = () =>
    onGoToCurrentMonth ? onGoToCurrentMonth() : onMonthChange(systemMonth)

  const handleSaveAsOf = () => {
    if (tempAsOf.trim()) onAsOfChange(tempAsOf.trim())
    setIsEditingAsOf(false)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Title + actions. The title stays in exported images; the buttons do not. */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <Eyebrow>
            {isEnhancement ? "Enhancement Timeline" : "New Product Timeline"}
          </Eyebrow>
          <h1 className="m-0 text-[28px] leading-tight font-bold text-ink sm:text-[40px]">
            งานเดือน{" "}
            <span className="text-pru-red">
              {parsedSelected ? thaiMonthLabel(selectedMonth) : selectedMonth}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
            {isEditingAsOf ? (
              <span className="export-hide inline-flex items-center gap-2">
                <label htmlFor="as-of-input" className="sr-only">
                  ข้อมูล ณ วันที่
                </label>
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
                  placeholder="เช่น as of 31 Aug"
                  className="h-9 w-40 border-2 border-ink bg-white px-2 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={handleSaveAsOf}
                  className="h-9 touch-target bg-brand-fill px-3 text-sm font-bold text-white"
                >
                  บันทึก
                </button>
              </span>
            ) : isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setTempAsOf(asOfText)
                  setIsEditingAsOf(true)
                }}
                title="แก้ไขวันที่ของข้อมูล"
                className="inline-flex items-center gap-1.5 text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
              >
                <PruIcon name="calendar" size={16} />
                {asOfText}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <PruIcon name="calendar" size={16} />
                {asOfText}
              </span>
            )}
            {typeof itemCount === "number" && (
              <span>· {itemCount} โครงการ</span>
            )}
            <span className="export-hide">
              <CloudStatusBadge
                isCloudConnected={isCloudConnected}
                isSyncing={isSyncing}
              />
            </span>
          </div>
        </div>

        <div className="export-hide flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenColorModal}
              className={`${outlineButton} hidden md:inline-flex`}
              title="จัดการช่องทางและสี"
            >
              <PruIcon name="board" size={18} />
              ช่องทาง
            </button>
          )}
          <button
            type="button"
            onClick={onExportAllClick}
            disabled={isExporting}
            className={`${outlineButton} hidden md:inline-flex`}
            title="บันทึกหน้านี้เป็นรูปภาพ PNG"
          >
            <PruIcon name="document" size={18} />
            {isExporting ? "กำลังสร้างรูป..." : "บันทึกเป็นรูป"}
          </button>
          {onSendLineClick && (
            <button
              type="button"
              onClick={onSendLineClick}
              disabled={isSendingLine}
              className={outlineButton}
            >
              {isSendingLine ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <PruIcon name="send" size={18} />
              )}
              {isSendingLine ? "กำลังส่ง..." : "ส่งรูปเข้า LINE"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={onAddClick}
              className="inline-flex h-11 touch-target items-center gap-2 border-2 border-brand-fill bg-brand-fill px-5 text-[15px] font-bold text-white hover:border-brand-hover hover:bg-brand-hover"
            >
              <PruIcon name="plus" size={18} strokeWidth={4} />
              เพิ่มงาน
            </button>
          )}
        </div>
      </div>

      {/* Controls: type, month and year */}
      <div className="export-hide flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="ประเภทงาน"
          className="flex border-2 border-rule bg-white"
        >
          {(["product", "enhancement"] as TimelineType[]).map((type) => {
            const selected = timelineType === type
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTimelineTypeChange(type)}
                className={`h-11 touch-target px-4 text-[15px] sm:px-5 ${selected ? "bg-ink font-bold text-white" : "bg-white text-ink hover:bg-surface"}`}
              >
                {type === "product" ? "New Product" : "Enhancement"}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              currentIndex > 0 && onMonthChange(displayMonths[currentIndex - 1])
            }
            disabled={currentIndex <= 0}
            aria-label="เดือนก่อนหน้า"
            className="inline-flex h-11 touch-target w-11 items-center justify-center border-2 border-rule bg-white text-ink disabled:opacity-40"
          >
            <PruIcon name="chevronLeft" size={18} strokeWidth={4} />
          </button>
          <label className="relative inline-flex items-center">
            <span className="sr-only">เลือกเดือน</span>
            <PruIcon
              name="calendar"
              size={18}
              className="pointer-events-none absolute left-3 text-pru-red"
            />
            <select
              value={currentIndex >= 0 ? selectedMonth : ""}
              onChange={(e) => onMonthChange(e.target.value)}
              className="h-11 border-2 border-rule bg-white pr-3 pl-10 text-base font-bold text-ink"
            >
              {displayMonths.map((m) => (
                <option key={m} value={m}>
                  {thaiMonthLabel(m)}
                  {getMonthStatus(m) === "current" ? " (เดือนนี้)" : ""}
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
            aria-label="เดือนถัดไป"
            className="inline-flex h-11 touch-target w-11 items-center justify-center border-2 border-rule bg-white text-ink disabled:opacity-40"
          >
            <PruIcon name="chevronRight" size={18} strokeWidth={4} />
          </button>
          {onYearChange && (
            <label className="inline-flex items-center">
              <span className="sr-only">เลือกปี</span>
              <select
                value={activeYear}
                onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                className="h-11 border-2 border-rule bg-white px-3 text-base text-ink"
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
            <button
              type="button"
              onClick={goToCurrent}
              className="h-11 touch-target px-2 text-sm font-bold text-ink underline underline-offset-4 hover:text-brand-ink"
            >
              กลับเดือนปัจจุบัน
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface TimelineTrackHeaderProps {
  timelineType: TimelineType
}

/** Column header shared by the screen table and the LINE image (same grid as TimelineRow). */
export function TimelineTrackHeader({
  timelineType,
}: TimelineTrackHeaderProps) {
  const phases =
    timelineType === "enhancement" ? ENHANCEMENT_PHASES : PRODUCT_PHASES

  return (
    <div className="grid min-w-[1080px] grid-cols-[280px_1fr_150px] items-stretch border-b-[3px] border-ink px-6 text-[15px] leading-tight font-bold">
      <div className="flex py-3 pr-3">
        <div className="flex min-h-[60px] flex-1 items-center border-2 border-rule bg-surface px-4 text-ink">
          โครงการ
        </div>
      </div>
      <div className="grid grid-cols-6">
        {phases.map((phase, i) => (
          <div
            key={phase.key}
            className={`flex px-1 py-3 ${i % 2 === 1 ? "bg-shade" : ""}`}
          >
            <div className="flex min-h-[60px] flex-1 items-center justify-center border-2 border-gray-400 bg-white px-2 text-center whitespace-pre-line text-ink">
              {phase.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex bg-pru-red-soft py-3 pl-1">
        <div className="flex min-h-[60px] flex-1 items-center justify-center gap-1.5 bg-pru-red px-2 text-center text-white">
          <PruIcon name="target" size={18} strokeWidth={4} />
          Target Launch
        </div>
      </div>
    </div>
  )
}
