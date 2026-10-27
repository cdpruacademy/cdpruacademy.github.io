"use client"

import * as React from "react"
import { monthLabel } from "./timeline-header"
import { getProgress } from "./timeline-row"
import { PartnerMix, StepTiles, TimelineTable, groupByPartner } from "./timeline-summary"
import { ProductItem, TimelineType } from "@/lib/timeline-data"
import { Partner } from "@/lib/partners"
import { Icon } from "@/components/icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface TimelineExportBoardProps {
  timelineType: TimelineType
  selectedMonth: string
  asOfText: string
  items: ProductItem[]
  partners: Partner[]
}

/** The Timeline image the LINE bot sends and "Save image" downloads (1280px wide, captured off-screen) */
export const TimelineExportBoard = React.forwardRef<HTMLDivElement, TimelineExportBoardProps>(
  ({ timelineType, selectedMonth, asOfText, items, partners }, ref) => {
    const isEnhancement = timelineType === "enhancement"
    const groups = groupByPartner(items, partners, timelineType)
    const progress = items.map((i) => getProgress(i, timelineType))
    const completed = progress.filter((p) => p.isFinished).length
    const onHold = items.filter((i) => i.isPaused).length

    return (
      <div ref={ref} style={{ width: "1280px" }} className="flex flex-col bg-paper font-sans text-ink">
        <div className="grid grid-cols-[minmax(0,1fr)_420px] items-end gap-7 bg-pru-red px-10 pt-7 pb-[84px] text-white">
          <div className="flex flex-col gap-3.5">
            <div className="text-xl font-bold">
              {isEnhancement ? "Enhancement Timeline" : "New Product Timeline"} · {monthLabel(selectedMonth)}
            </div>
            <div className="flex items-end gap-4">
              <span className="text-[120px] leading-[0.82] font-bold tracking-[-0.04em]">{items.length}</span>
              <span className="pb-1 text-[28px] leading-tight font-bold">
                Projects
                <span className="block text-[15px] font-medium">Last updated · {asOfText}</span>
              </span>
            </div>
            <div className="flex gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 text-[15px] font-bold text-done">
                <Icon name="completed" size={20} strokeWidth={2} />
                {completed} Completed
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 text-[15px] font-bold text-brand-ink">
                <Icon name="inProgress" size={20} strokeWidth={2} />
                {items.length - completed - onHold} In progress
              </span>
              {onHold > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1.5 pr-3.5 pl-2 text-[15px] font-semibold">
                  <Icon name="onHold" size={20} strokeWidth={2} />
                  {onHold} On hold
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3.5">
            <span className="inline-flex rounded-2xl bg-white px-3.5 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${BASE_PATH}/prudential-logo-th.png`} alt="พรูเด็นเชียล ประกันชีวิต" style={{ height: 34, width: "auto" }} />
            </span>
            {groups.length > 0 && (
              <div className="w-full rounded-[20px] bg-white p-4 text-ink">
                <b className="mb-2.5 block text-sm">Projects by partner</b>
                <PartnerMix groups={groups} />
              </div>
            )}
          </div>
        </div>

        <div className="-mt-14 flex flex-col gap-4 px-10">
          <StepTiles items={items} timelineType={timelineType} compact />
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[var(--shadow-card)]">
            {items.length === 0 ? (
              <div className="py-12 text-center text-base text-ink-soft">No projects this month</div>
            ) : (
              <TimelineTable items={items} timelineType={timelineType} partners={partners} compact />
            )}
          </div>
        </div>

        <div className="px-10 pt-4 pb-5 text-center text-xs text-ink-soft">
          Confidential: เอกสารนี้จัดทำขึ้นเพื่อใช้ภายในฝ่ายพัฒนาหลักสูตรเท่านั้น
        </div>
      </div>
    )
  }
)

TimelineExportBoard.displayName = "TimelineExportBoard"
