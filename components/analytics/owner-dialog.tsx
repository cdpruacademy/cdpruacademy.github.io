"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { Icon } from "@/components/icon"
import { KpiDialog } from "@/components/kpi/kpi-dialog"
import { Partner, inkOf, partnerOf } from "@/lib/partners"
import type { AuditItem, RefresherItem } from "@/lib/team-metrics"
import type { PhaseKey, ProductItem, TimelineType } from "@/lib/timeline-data"

export interface OwnerItem extends ProductItem {
  type: TimelineType | "refresher" | "audit"
  isCompleted: boolean
  isPaused: boolean
  isCoOwned: boolean
  currentPhaseLabel: string
  currentPhaseKey: string
  refresher?: RefresherItem["refresher"]
  audit?: AuditItem["audit"]
}

// A step the project skips is left off its progress line
const TRACK_STEPS: PhaseKey[] = [
  "kick-off",
  "first-draft",
  "first-draft-elearning",
  "final-approval",
  "final-elearning",
  "internal-training",
  "launch",
]

const TYPES = [
  { key: "product", label: "New Product", dot: "bg-pru-red", text: "text-brand-ink" },
  { key: "enhancement", label: "Enhancement", dot: "bg-enhancement", text: "text-enhancement" },
  { key: "refresher", label: "Refresher", dot: "bg-ink", text: "text-ink" },
  { key: "audit", label: "Audit", dot: "bg-stone-400", text: "text-ink-soft" },
] as const

type Status = "now" | "done" | "hold"

/** One owner's projects: how many of each type, then the list by status */
export function OwnerDialog({
  member,
  color,
  items,
  partners,
  onClose,
}: {
  /** null is the whole team */
  member: string | null
  color: string
  items: OwnerItem[]
  partners: Partner[]
  onClose: () => void
}) {
  const [status, setStatus] = useState<Status>(() =>
    items.some((i) => !i.isCompleted && !i.isPaused) ? "now" : "done"
  )
  const [search, setSearch] = useState("")

  const tabs = useMemo(() => {
    const q = search.trim().toLowerCase()
    const found = items.filter(
      (i) => !q || i.name.toLowerCase().includes(q) || (i.broker || "").toLowerCase().includes(q)
    )
    return [
      { key: "now" as const, label: "In progress", dot: "bg-pru-red", on: "border-pru-red bg-pru-red-soft", items: found.filter((i) => !i.isCompleted && !i.isPaused) },
      { key: "done" as const, label: "Completed", dot: "bg-done", on: "border-done bg-done-soft", items: found.filter((i) => i.isCompleted) },
      { key: "hold" as const, label: "On hold", dot: "bg-ink-soft", on: "border-ink-soft bg-surface", items: found.filter((i) => i.isPaused) },
    ]
  }, [items, search])
  const rows = tabs.find((t) => t.key === status)?.items || []

  return (
    <KpiDialog
      wide
      icon="team"
      leading={
        member ? (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: color }}
          >
            {member.split(" ").map((w) => w[0]).join("")}
          </span>
        ) : undefined
      }
      title={member || "Whole team"}
      subtitle={`${items.length} projects`}
      onClose={onClose}
      toolbar={
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {TYPES.map((t) => (
              <div key={t.key} className="rounded-2xl bg-paper px-3 py-3 sm:px-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft sm:text-[13px]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="mt-0.5 block text-[30px] leading-tight font-bold tabular-nums">
                  {items.filter((i) => i.type === t.key).length}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const on = status === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  aria-pressed={on}
                  className={`touch-target inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-sm font-semibold text-ink ${on ? tab.on : "border-rule bg-white hover:bg-paper"}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${tab.dot}`} />
                  {tab.label}
                  <b className="font-bold tabular-nums">{tab.items.length}</b>
                </button>
              )
            })}
            <label className="relative min-w-[180px] flex-1 sm:ml-auto sm:max-w-[260px]">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
                <Icon name="search" size={16} />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา project หรือ Channel"
                aria-label="ค้นหา project"
                className="h-10 w-full rounded-full border-[1.5px] border-rule bg-white pr-3 pl-9 text-sm focus:border-ink focus:outline-none"
              />
            </label>
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="px-7 py-12 text-center text-[15px] font-semibold text-stone-700">ไม่มี project ในกลุ่มนี้</p>
      ) : (
        <ul className="divide-y divide-surface px-5 sm:px-7">
          {rows.map((item) => {
            const partner = partnerOf(item.broker, partners)
            const type = TYPES.find((t) => t.key === item.type)
            const launch = item.commercialDate || item.customRightLabel || ""
            const when = item.refresher
              ? `Q${item.refresher.quarter}`
              : /^\d/.test(launch)
                ? launch.split(/\s+/).slice(0, 2).join(" ")
                : "TBC"
            const tone = item.isCompleted ? "bg-done" : item.isPaused ? "bg-ink-soft" : "bg-pru-red"
            const steps = TRACK_STEPS.filter((key) => key === "launch" || item.milestones?.[key])
            const currentIndex = steps.indexOf(item.currentPhaseKey as PhaseKey)
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-6 gap-y-2.5 py-4">
                <div className="min-w-0 flex-[1_1_280px]">
                  <b className="block text-[15px] font-semibold text-ink">{item.name}</b>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-soft">
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: inkOf(partner.color) }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: partner.color }} />
                      {item.broker || partner.name}
                    </span>
                    {type && <span className={`font-semibold ${type.text}`}>{type.label}</span>}
                    {(!member || item.isCoOwned) && <span>{item.owner || "ยังไม่ระบุ"}</span>}
                  </span>
                </div>
                <div className="min-w-[190px] flex-[0_1_230px]">
                  {!item.refresher && !item.audit && (
                    <span className="flex items-center" aria-hidden="true">
                      {steps.map((key, i) => {
                        const isNow = !item.isCompleted && i === currentIndex
                        const isDone =
                          item.isCompleted ||
                          (currentIndex >= 0 ? i < currentIndex : item.milestones?.[key]?.status === "completed")
                        return (
                          <React.Fragment key={key}>
                            <span
                              className={`shrink-0 rounded-full ${isNow ? `h-4 w-4 ${tone}` : isDone ? `h-3 w-3 ${tone}` : "h-3 w-3 border-2 border-stone-300 bg-white"}`}
                            />
                            {i < steps.length - 1 && (
                              <span className={`h-[3px] min-w-1 flex-1 ${isDone ? tone : "bg-rule"}`} />
                            )}
                          </React.Fragment>
                        )
                      })}
                    </span>
                  )}
                  <span
                    className={`mt-1.5 block text-[13px] font-semibold ${item.isCompleted ? "text-done" : item.isPaused ? "text-ink-soft" : "text-brand-ink"}`}
                  >
                    {item.audit ? `${item.audit.files || 0} ไฟล์ · ${item.currentPhaseLabel}` : item.currentPhaseLabel}
                  </span>
                </div>
                <b className={`w-16 shrink-0 text-right text-[15px] font-bold whitespace-nowrap tabular-nums ${when === "TBC" ? "text-ink-soft" : "text-ink"}`}>
                  {when}
                </b>
              </li>
            )
          })}
        </ul>
      )}
    </KpiDialog>
  )
}
