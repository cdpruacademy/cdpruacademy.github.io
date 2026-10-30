"use client"

import * as React from "react"
import { Icon } from "@/components/icon"
import { LEVEL_HINT, LEVEL_LABEL, Level, ProjectFactors, ownersOf, sharesOf } from "@/lib/difficulty"
import { ScoredProject, fmt } from "@/lib/kpi-summary"

const LEVELS: Level[] = ["high", "medium"]
const ADJUST = [-1, 0, 1]

const segment = (on: boolean) =>
  `h-8 min-w-11 rounded-full px-3 text-[13px] font-semibold ${on ? "bg-ink text-white" : "text-ink-soft hover:bg-rule"}`

/** One project: level, e-Learning, new content, a ±1 nudge and the split between owners */
export function ProjectRow({ project: p, onChange }: { project: ScoredProject; onChange: (f: ProjectFactors) => void }) {
  const isProduct = p.type === "product"
  const owners = ownersOf(p.item.owner).filter((o) => o !== "—")
  const split = sharesOf(p.item.owner, p.factors.shares)
  const status = p.completed
    ? { label: `Completed ${p.completedMonth ?? ""}`, cls: "bg-done-soft text-done" }
    : p.isActiveNow
      ? { label: "In progress", cls: "bg-pru-red-soft text-brand-ink" }
      : { label: "Not on Timeline", cls: "bg-surface text-ink-soft" }

  const autoElearning = p.factors.elearning === undefined
  const elearningOn = p.score.elearning > 0

  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${isProduct ? "bg-pru-red-soft text-brand-ink" : "bg-enh-soft text-enh"}`}>
              {isProduct ? "New Product" : "Enhancement"}
            </span>
            <span className={`rounded-full px-2 py-0.5 ${status.cls}`}>{status.label}</span>
          </div>
          <div className="mt-1 text-[15px] leading-snug font-semibold">{p.item.name.replace(/\n/g, " ")}</div>
          <div className="text-[13px] text-ink-soft">
            {p.item.broker} · {owners.join(" / ") || "ยังไม่มีผู้รับผิดชอบ"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[28px] leading-none font-bold tabular-nums">{fmt(p.score.total)}</span>
          <span className="block text-[11px] text-ink-soft">pts</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {isProduct ? (
          <div role="group" aria-label="หมวด" className="inline-flex items-center gap-0.5 rounded-full bg-surface p-[3px]">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={p.score.level === l}
                title={LEVEL_HINT[l]}
                onClick={() => onChange({ ...p.factors, level: l })}
                className={segment(p.score.level === l)}
              >
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        ) : (
          <span className="inline-flex h-[38px] items-center rounded-full bg-surface px-4 text-[13px] font-semibold text-ink-soft">
            {LEVEL_LABEL.low}
          </span>
        )}
        {isProduct && !p.factors.level && <span className="text-xs text-ink-soft">เดาจากชื่อ ยังไม่ได้ยืนยัน</span>}

        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={elearningOn}
            onChange={(e) => onChange({ ...p.factors, elearning: e.target.checked })}
            className="h-4 w-4 accent-ink"
          />
          <Icon name="elearning" size={15} />
          e-Learning
        </label>

        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={Boolean(p.factors.newContent)}
            onChange={(e) => onChange({ ...p.factors, newContent: e.target.checked || undefined })}
            className="h-4 w-4 accent-ink"
          />
          New content
        </label>

        {!isProduct && (
          <label className="inline-flex items-center gap-2 text-[13px] font-semibold" title="งาน Audit: จำนวนไฟล์เก่าที่แก้">
            <Icon name="folder" size={15} />
            Audit files
            <input
              type="number"
              min={0}
              max={500}
              value={p.factors.files ?? ""}
              placeholder="0"
              onChange={(e) => {
                const v = Math.round(Number(e.target.value))
                onChange({ ...p.factors, files: Number.isFinite(v) && v > 0 ? v : undefined })
              }}
              className="h-8 w-16 rounded-lg border-[1.5px] border-rule bg-white px-2 text-right tabular-nums focus:border-ink focus:outline-none"
            />
          </label>
        )}

        <div role="group" aria-label="ปรับคะแนน" className="inline-flex items-center gap-0.5 rounded-full bg-surface p-[3px]">
          {ADJUST.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={(p.factors.adjust ?? 0) === v}
              onClick={() => onChange({ ...p.factors, adjust: v || undefined })}
              className={segment((p.factors.adjust ?? 0) === v)}
            >
              {v > 0 ? "+1" : v < 0 ? "−1" : "±0"}
            </button>
          ))}
        </div>
        {!autoElearning && (
          <button
            type="button"
            onClick={() => onChange({ ...p.factors, elearning: undefined })}
            className="text-xs font-semibold text-ink-soft underline-offset-2 hover:underline"
          >
            e-Learning ตามระบบ
          </button>
        )}
      </div>

      {owners.length > 1 && (
        <SharesEditor
          owners={owners}
          split={split}
          points={p.score.total}
          onChange={(shares) => onChange({ ...p.factors, shares })}
        />
      )}
    </li>
  )
}

/** Percent per owner of a shared piece of work; empty means an equal split */
export function SharesEditor({
  owners,
  split,
  points,
  onChange,
}: {
  owners: string[]
  split: Record<string, number>
  points: number
  onChange: (shares: Record<string, number> | undefined) => void
}) {
  const pct = (o: string) => Math.round((split[o] ?? 0) * 100)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] bg-paper px-3 py-2.5 text-[13px]">
      <span className="font-semibold">แบ่งคะแนน</span>
      {owners.map((o) => (
        <label key={o} className="inline-flex items-center gap-1.5">
          <span>{o}</span>
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={pct(o)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)))
              // Two people: the other gets the rest, so the split always adds up to 100%
              const next = Object.fromEntries(owners.map((n) => [n, n === o ? v : owners.length === 2 ? 100 - v : pct(n)]))
              onChange(next)
            }}
            className="h-8 w-16 rounded-lg border-[1.5px] border-rule bg-white px-2 text-right tabular-nums focus:border-ink focus:outline-none"
          />
          <span className="text-ink-soft">% · {fmt(Math.round(points * (split[o] ?? 0) * 10) / 10)} คะแนน</span>
        </label>
      ))}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className="font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        แบ่งเท่ากัน
      </button>
    </div>
  )
}
