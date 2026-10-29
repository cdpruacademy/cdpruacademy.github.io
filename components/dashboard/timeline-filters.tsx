"use client"

import * as React from "react"
import { ProductItem, TimelineType } from "@/lib/timeline-data"
import { Icon } from "@/components/icon"
import { card } from "@/components/page-hero"
import { PickMenu } from "@/components/ui/pick-menu"
import { Partner, partnerOf } from "@/lib/partners"
import { getProgress } from "./timeline-row"
import { PartnerGroup } from "./timeline-summary"

export type StatusFilter = "all" | "active" | "done" | "hold"

export interface TimelineFilterState {
  query: string
  partnerId: string
  status: StatusFilter
}

export const NO_FILTERS: TimelineFilterState = { query: "", partnerId: "all", status: "all" }

/** Same order as the row colours: finished is green even if it was paused */
export function statusOf(item: ProductItem, timelineType: TimelineType): Exclude<StatusFilter, "all"> {
  if (getProgress(item, timelineType).isFinished) return "done"
  return item.isPaused ? "hold" : "active"
}

/** Projects that match the search, partner and status; only the page uses this, never the LINE image */
export function applyFilters(
  items: ProductItem[],
  filters: TimelineFilterState,
  partners: Partner[],
  timelineType: TimelineType
): ProductItem[] {
  const q = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.status !== "all" && statusOf(item, timelineType) !== filters.status) return false
    if (filters.partnerId !== "all" && partnerOf(item.broker, partners).id !== filters.partnerId) return false
    if (!q) return true
    return [item.name, item.broker, item.owner].some((t) => (t || "").toLowerCase().includes(q))
  })
}

const STATUSES: { value: StatusFilter; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "In progress", dot: "bg-pru-red" },
  { value: "done", label: "Completed", dot: "bg-done" },
  { value: "hold", label: "On hold", dot: "bg-stone-600" },
]

/** Search, partner and status filters above the timeline table */
export function TimelineFilters({
  filters,
  onChange,
  groups,
  items,
  timelineType,
  shown,
}: {
  filters: TimelineFilterState
  onChange: (next: TimelineFilterState) => void
  groups: PartnerGroup[]
  items: ProductItem[]
  timelineType: TimelineType
  shown: number
}) {
  const counts = { all: items.length, active: 0, done: 0, hold: 0 }
  items.forEach((i) => counts[statusOf(i, timelineType)]++)
  const isFiltered =
    filters.query.trim() !== "" || filters.partnerId !== "all" || filters.status !== "all"
  const set = (patch: Partial<TimelineFilterState>) => onChange({ ...filters, ...patch })

  return (
    <section aria-label="Filter projects" className={`${card} flex flex-col gap-3 p-3 sm:p-3.5`}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">Search projects</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink-soft" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Search project, channel or owner"
            className="h-10 w-full rounded-full bg-surface pr-4 pl-10 text-sm text-ink placeholder:text-ink-soft focus:bg-white focus:ring-2 focus:ring-brand-ink focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2.5">
          <PickMenu
            label="Partner"
            value={filters.partnerId}
            onChange={(partnerId) => set({ partnerId })}
            options={[
              { value: "all", label: "All partners" },
              ...groups.map((g) => ({ value: g.partner.id, label: `${g.partner.name} (${g.items.length})` })),
            ]}
            className="h-10 w-full min-w-[150px] rounded-full border border-rule bg-white px-4 text-sm font-semibold text-ink hover:bg-surface sm:w-auto"
          />

          <div role="radiogroup" aria-label="Status" className="grid w-full grid-cols-2 gap-1 rounded-[18px] bg-surface p-1 sm:flex sm:w-auto sm:gap-0 sm:rounded-full">
            {STATUSES.map((s) => {
              const active = filters.status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ status: s.value })}
                  className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? "bg-white text-ink shadow-[0_1px_3px_rgba(28,25,23,0.16)]" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {s.dot && <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />}
                  {s.label}
                  <span className={active ? "text-ink-soft" : "text-stone-400"}>{counts[s.value]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {isFiltered && (
        <div className="flex items-center justify-between gap-3 px-1.5 text-[13px] text-ink-soft" aria-live="polite">
          <span>
            Showing <b className="text-ink">{shown}</b> of {items.length} projects
          </span>
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"
          >
            <Icon name="close" size={14} strokeWidth={2.4} />
            Clear filters
          </button>
        </div>
      )}
    </section>
  )
}
