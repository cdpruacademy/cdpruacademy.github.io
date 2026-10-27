"use client"

import * as React from "react"
import { TimelineTrackHeader, thaiMonthLabel } from "./timeline-header"
import { TimelineRow, TimelineLegend } from "./timeline-row"
import { ProductItem, TimelineType } from "@/lib/timeline-data"
import { Eyebrow, PruIcon } from "@/components/pru-icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface TimelineExportBoardProps {
  timelineType: TimelineType
  selectedMonth: string
  asOfText: string
  items: ProductItem[]
  colorMap: Record<string, string>
}

/** The Timeline image the LINE bot sends (1280px wide, captured off-screen). */
export const TimelineExportBoard = React.forwardRef<
  HTMLDivElement,
  TimelineExportBoardProps
>(({ timelineType, selectedMonth, asOfText, items, colorMap }, ref) => {
  const isEnhancement = timelineType === "enhancement"

  return (
    <div
      ref={ref}
      style={{ width: "1280px" }}
      className="flex flex-col gap-6 bg-paper px-14 pt-10 pb-8 font-sans text-ink"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>
            {isEnhancement ? "Enhancement Timeline" : "New Product Timeline"}
          </Eyebrow>
          <div className="text-[44px] leading-tight font-bold">
            งานเดือน{" "}
            <span className="text-pru-red">
              {thaiMonthLabel(selectedMonth)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-lg text-ink-soft">
            <PruIcon name="calendar" size={22} className="text-pru-red" />
            {asOfText} · {items.length} โครงการ
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_PATH}/prudential-logo-th.png`}
          alt="พรูเด็นเชียล ประกันชีวิต"
          style={{ width: 240, height: "auto" }}
        />
      </div>

      <div className="border-2 border-rule bg-white">
        <TimelineTrackHeader timelineType={timelineType} />
        {items.length === 0 ? (
          <div className="py-12 text-center text-base text-ink-soft">
            ไม่มีโครงการในเดือนนี้
          </div>
        ) : (
          items.map((item) => (
            <TimelineRow
              key={item.id}
              product={item}
              timelineType={timelineType}
              isAdmin={false}
              onEdit={() => {}}
              onDelete={() => {}}
              onPause={() => {}}
              onResume={() => {}}
              customColorMap={colorMap}
            />
          ))
        )}
        <TimelineLegend large />
      </div>

      <div className="text-center text-sm whitespace-nowrap text-ink-soft">
        Confidential: เอกสารนี้จัดทำขึ้นเพื่อใช้ภายในฝ่ายพัฒนาหลักสูตรเท่านั้น
      </div>
    </div>
  )
})

TimelineExportBoard.displayName = "TimelineExportBoard"
