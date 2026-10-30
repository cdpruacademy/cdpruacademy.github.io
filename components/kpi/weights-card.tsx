"use client"

import * as React from "react"
import { DEFAULT_WEIGHTS, DifficultyWeights, LEVEL_HINT, LEVEL_LABEL } from "@/lib/difficulty"

const GROUPS: { title: string; fields: { key: keyof DifficultyWeights; label: string; hint?: string }[] }[] = [
  {
    title: "คะแนนตามประเภท",
    fields: [
      { key: "high", label: LEVEL_LABEL.high, hint: LEVEL_HINT.high },
      { key: "medium", label: LEVEL_LABEL.medium, hint: LEVEL_HINT.medium },
      { key: "low", label: LEVEL_LABEL.low, hint: LEVEL_HINT.low },
    ],
  },
  {
    title: "คะแนนเพิ่ม",
    fields: [
      { key: "elearning", label: "e-Learning", hint: "ช่องทาง ttb มีเสมอ" },
      { key: "newContent", label: "New content" },
      { key: "audit", label: "Audit: coordination", hint: "1 ครั้งต่องาน" },
      { key: "perFile", label: "Audit: per file", hint: "ต่อ 1 ไฟล์ที่แก้" },
      { key: "refresher", label: "Refresher", hint: "ต่อ 1 บทเรียน" },
    ],
  },
]

/** Points per factor, edited in the "Edit points" dialog */
export function WeightsForm({
  weights,
  onChange,
}: {
  weights: DifficultyWeights
  onChange: (next: DifficultyWeights) => void
}) {
  const isDefault = GROUPS.every((g) => g.fields.every((f) => weights[f.key] === DEFAULT_WEIGHTS[f.key]))
  return (
    <div className="flex flex-col gap-5 px-5 py-4 sm:px-7">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <h3 className="mb-1 text-[13px] font-semibold text-ink-soft">{g.title}</h3>
          <div className="flex flex-col divide-y divide-rule">
            {g.fields.map((f) => (
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
        </div>
      ))}
      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_WEIGHTS)}
          className="w-fit text-[13px] font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          กลับไปใช้ค่าเริ่มต้น
        </button>
      )}
    </div>
  )
}
