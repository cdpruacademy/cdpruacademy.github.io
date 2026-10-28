"use client"

import * as React from "react"
import {
  ENHANCEMENT_PHASES,
  PRODUCT_PHASES,
  ProductItem,
  TimelineType,
} from "@/lib/timeline-data"
import { Icon, PHASE_ICONS } from "@/components/icon"
import { Partner, UNASSIGNED_PARTNER, partnerOf } from "@/lib/partners"
import {
  PHASE_HEADINGS,
  PartnerGroupHeader,
  TimelineLegend,
  TimelineRow,
  getProgress,
} from "./timeline-row"
import { TimelineTrackHeader } from "./timeline-header"

export interface PartnerGroup {
  partner: Partner
  items: ProductItem[]
  done: number
}

/** Projects grouped by partner, in the partners' order; unknown channels go last */
export function groupByPartner(
  items: ProductItem[],
  partners: Partner[],
  timelineType: TimelineType
): PartnerGroup[] {
  const order = [...partners, UNASSIGNED_PARTNER]
  const map = new Map<string, ProductItem[]>()
  items.forEach((item) => {
    const p = partnerOf(item.broker, partners)
    map.set(p.id, [...(map.get(p.id) || []), item])
  })
  return order
    .filter((p) => map.has(p.id))
    .map((partner) => {
      const list = map.get(partner.id) || []
      return {
        partner,
        items: list,
        done: list.filter((i) => getProgress(i, timelineType).isFinished).length,
      }
    })
}

/** One tile per step: how many projects are on it now, plus Completed */
export function StepTiles({
  items,
  timelineType,
  compact = false,
}: {
  items: ProductItem[]
  timelineType: TimelineType
  compact?: boolean
}) {
  const progress = items.map((i) => getProgress(i, timelineType))
  const phases =
    timelineType === "enhancement" ? ENHANCEMENT_PHASES : PRODUCT_PHASES
  const tiles = phases.map((phase, i) => {
    const n = progress.filter((p) => p.current === i).length
    return {
      key: phase.key,
      label: PHASE_HEADINGS[phase.key],
      icon: PHASE_ICONS[phase.key],
      n,
      active: n > 0,
    }
  })
  const done = progress.filter((p) => p.isFinished).length
  return (
    <section
      aria-label="Projects at each step"
      className={`grid grid-cols-4 sm:grid-cols-7 ${compact ? "gap-2" : "gap-2.5"}`}
    >
      {tiles.map((t) => (
        <div
          key={t.key}
          className={`flex flex-col items-center gap-2 rounded-2xl bg-white text-center ${compact ? "px-2 py-3" : "px-2 py-4"} ${t.active ? "shadow-[inset_0_0_0_2px_var(--color-pru-red-line)]" : "shadow-[var(--shadow-card)]"}`}
        >
          <span
            className={`flex items-center justify-center rounded-[14px] ${compact ? "h-10 w-10" : "h-12 w-12"} ${t.active ? "bg-pru-red-soft text-brand-ink" : "bg-surface text-gray-400"}`}
          >
            <Icon name={t.icon} size={compact ? 20 : 24} />
          </span>
          <span className={`leading-none font-bold text-[30px] ${t.active ? "text-brand-ink" : "text-gray-400"}`}>
            {t.n}
          </span>
          <span className={`min-h-[30px] leading-tight font-semibold whitespace-pre-line text-ink ${compact ? "text-sm" : "text-xs"}`}>
            {t.label}
          </span>
        </div>
      ))}
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl bg-white text-center shadow-[inset_0_0_0_2px_var(--color-done-line)] ${compact ? "px-2 py-3" : "px-2 py-4"}`}
      >
        <span className={`flex items-center justify-center rounded-[14px] bg-done-soft text-done ${compact ? "h-10 w-10" : "h-12 w-12"}`}>
          <Icon name="completed" size={compact ? 20 : 24} />
        </span>
        <span className={`leading-none font-bold text-done text-[30px]`}>{done}</span>
        <span className={`min-h-[30px] leading-tight font-semibold text-ink ${compact ? "text-sm" : "text-xs"}`}>Completed</span>
      </div>
    </section>
  )
}

/** Stacked bar and counts by partner */
export function PartnerMix({ groups }: { groups: PartnerGroup[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex h-[18px] gap-[3px] overflow-hidden rounded-full">
        {groups.map((g) => (
          <span key={g.partner.id} style={{ flex: g.items.length, background: g.partner.color }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {groups.map((g) => (
          <span key={g.partner.id} className="flex items-center gap-2.5">
            <span
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-white"
              style={{ background: g.partner.color }}
            >
              <Icon name="partner" size={18} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <b className="text-lg">{g.items.length}</b>
              <span className="truncate text-xs text-ink-soft">{g.partner.name}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

interface TimelineTableProps {
  items: ProductItem[]
  timelineType: TimelineType
  partners: Partner[]
  isAdmin?: boolean
  onEdit?: (p: ProductItem) => void
  onDelete?: (p: ProductItem) => void
  onPause?: (p: ProductItem) => void
  onResume?: (p: ProductItem) => void
  compact?: boolean
}

const noop = () => {}

/** Column headings, partner groups and rows, then the key */
export function TimelineTable({
  items,
  timelineType,
  partners,
  isAdmin = false,
  onEdit = noop,
  onDelete = noop,
  onPause = noop,
  onResume = noop,
  compact = false,
}: TimelineTableProps) {
  const groups = groupByPartner(items, partners, timelineType)
  return (
    <>
      <TimelineTrackHeader timelineType={timelineType} compact={compact} />
      {groups.map((g) => (
        <React.Fragment key={g.partner.id}>
          <PartnerGroupHeader partner={g.partner} count={g.items.length} done={g.done} compact={compact} />
          {g.items.map((item) => (
            <TimelineRow
              key={item.id}
              product={item}
              timelineType={timelineType}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onPause={onPause}
              onResume={onResume}
              compact={compact}
            />
          ))}
        </React.Fragment>
      ))}
      <TimelineLegend large={compact} />
    </>
  )
}
