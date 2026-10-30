"use client"

import * as React from "react"
import { card } from "@/components/page-hero"
import { DEFAULT_WEIGHTS, DifficultyWeights, LEVEL_HINT, LEVEL_LABEL } from "@/lib/difficulty"

const FIELDS: { key: keyof DifficultyWeights; label: string; hint?: string }[] = [
  { key: "high", label: `หมวด${LEVEL_LABEL.high}`, hint: LEVEL_HINT.high },
  { key: "medium", label: `หมวด${LEVEL_LABEL.medium}`, hint: LEVEL_HINT.medium },
  { key: "low", label: `หมวด${LEVEL_LABEL.low}`, hint: LEVEL_HINT.low },
  { key: "elearning", label: "มี e-Learning", hint: "ช่องทาง ttb มีเสมอ" },
  { key: "newContent", label: "เนื้อหาใหม่" },
  { key: "refresher", label: "Refresher", hint: "ต่อ 1 บทเรียน" },
]

/** Points per factor */
export function WeightsCard({
  weights,
  onChange,
}: {
  weights: DifficultyWeights
  onChange: (next: DifficultyWeights) => void
}) {
  const isDefault = FIELDS.every((f) => weights[f.key] === DEFAULT_WEIGHTS[f.key])
  return (
    <section className={`${card} max-w-xl p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">คะแนนของแต่ละปัจจัย</h2>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_WEIGHTS)}
            className="text-[13px] font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            ค่าเริ่มต้น
          </button>
        )}
      </div>
      <div className="flex flex-col divide-y divide-rule">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              <span className="font-semibold">{f.label}</span>
              {f.hint && <span className="block text-xs text-ink-soft">{f.hint}</span>}
            </span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={weights[f.key]}
              onChange={(e) => {
                const v = Number(e.target.value)
                onChange({ ...weights, [f.key]: Number.isFinite(v) ? Math.max(0, v) : 0 })
              }}
              className="h-9 w-20 rounded-xl border-[1.5px] border-rule bg-white px-3 text-right text-sm font-semibold tabular-nums focus:border-ink focus:outline-none"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-ink-soft">แต่ละงานปรับเพิ่มหรือลดได้อีก 1 คะแนน</p>
    </section>
  )
}
