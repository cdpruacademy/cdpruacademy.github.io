"use client"

import * as React from "react"
import { Icon } from "@/components/icon"
import { card } from "@/components/page-hero"
import { KpiProject, ProjectFactors, ScoreBreakdown, hasElearning } from "@/lib/difficulty"

export interface ScoredProject extends KpiProject {
  score: ScoreBreakdown
  factors: ProjectFactors
  isActiveNow: boolean
}

const ADJUST = [-1, 0, 1]

/** Every project with its factors; the owner ticks new content, channels and ±1 here */
export function ProjectScoreList({
  projects,
  onChange,
  toolbar,
}: {
  projects: ScoredProject[]
  onChange: (id: string, next: ProjectFactors) => void
  toolbar: React.ReactNode
}) {
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold">Projects</h2>
        {toolbar}
      </div>
      {projects.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ink-soft">ไม่มีงาน</p>
      ) : (
        <ul className="divide-y divide-rule border-t border-rule">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} onChange={(f) => onChange(p.id, f)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ProjectRow({ project: p, onChange }: { project: ScoredProject; onChange: (f: ProjectFactors) => void }) {
  const isProduct = p.type === "product"
  const status = p.completed
    ? { label: `Completed ${p.completedMonth ?? ""}`, cls: "bg-done-soft text-done" }
    : p.isActiveNow
      ? { label: "In progress", cls: "bg-pru-red-soft text-brand-ink" }
      : { label: "Not on timeline", cls: "bg-surface text-ink-soft" }

  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className={`rounded-full px-2 py-0.5 ${isProduct ? "bg-pru-red-soft text-brand-ink" : "bg-enh-soft text-enh"}`}>
            {isProduct ? "New Product" : "Enhancement"}
          </span>
          <span className={`rounded-full px-2 py-0.5 ${status.cls}`}>{status.label}</span>
          {hasElearning(p.item) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-ink-soft">
              <Icon name="elearning" size={13} strokeWidth={2} />
              e-Learning
            </span>
          )}
        </div>
        <div className="mt-1 line-clamp-2 text-[15px] font-semibold" title={p.item.name}>
          {p.item.name.replace(/\n/g, " ")}
        </div>
        <div className="text-[13px] text-ink-soft">
          {p.item.broker} · {p.item.owner || "—"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={Boolean(p.factors.newContent)}
            onChange={(e) => onChange({ ...p.factors, newContent: e.target.checked || undefined })}
            className="h-4 w-4 accent-ink"
          />
          เนื้อหาใหม่
        </label>

        <label className="flex items-center gap-1.5 text-[13px] font-semibold">
          Channels
          <input
            type="number"
            min={1}
            max={20}
            value={p.score.channelCount}
            onChange={(e) => {
              const v = Math.round(Number(e.target.value))
              onChange({ ...p.factors, channels: Number.isFinite(v) && v >= 1 ? v : undefined })
            }}
            className="h-8 w-14 rounded-lg border-[1.5px] border-rule bg-white px-2 text-right text-sm tabular-nums focus:border-ink focus:outline-none"
          />
        </label>

        <div role="group" aria-label="ปรับคะแนน" className="inline-flex gap-0.5 rounded-full bg-surface p-[3px]">
          {ADJUST.map((v) => {
            const on = (p.factors.adjust ?? 0) === v
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...p.factors, adjust: v || undefined })}
                className={`h-7 min-w-9 rounded-full px-2 text-[13px] font-semibold tabular-nums ${on ? "bg-ink text-white" : "text-ink-soft hover:bg-rule"}`}
              >
                {v > 0 ? "+1" : v < 0 ? "−1" : "0"}
              </button>
            )
          })}
        </div>

        <div className="w-14 text-right" title={breakdownText(p.score)}>
          <span className="text-2xl leading-none font-bold tabular-nums">{fmt(p.score.total)}</span>
          <span className="block text-[11px] text-ink-soft">pts</span>
        </div>
      </div>
    </li>
  )
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function breakdownText(s: ScoreBreakdown) {
  return [
    `ประเภท ${fmt(s.type)}`,
    `Channel ${fmt(s.channels)}`,
    `e-Learning ${fmt(s.elearning)}`,
    `เนื้อหาใหม่ ${fmt(s.newContent)}`,
    `ปรับ ${s.adjust > 0 ? "+" : ""}${s.adjust}`,
  ].join(" · ")
}
