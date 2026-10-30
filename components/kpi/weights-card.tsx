"use client"

import * as React from "react"
import { card } from "@/components/page-hero"
import { DEFAULT_WEIGHTS, DifficultyWeights } from "@/lib/difficulty"

const FIELDS: { key: keyof DifficultyWeights; label: string }[] = [
  { key: "product", label: "New Product" },
  { key: "enhancement", label: "Enhancement" },
  { key: "perExtraChannel", label: "Channel ที่เพิ่ม (ต่อ 1)" },
  { key: "elearning", label: "มี e-Learning" },
  { key: "newContent", label: "เนื้อหาใหม่" },
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
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Weights</h2>
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
      <div className="flex flex-col gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
            <span>{f.label}</span>
            <input
              type="number"
              min={0}
              max={10}
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
      <p className="mt-3 text-[13px] text-ink-soft">ปรับมือได้ ±1 ต่องาน</p>
    </section>
  )
}
