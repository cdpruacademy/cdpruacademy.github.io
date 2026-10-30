"use client"

import * as React from "react"
import { useState } from "react"
import { Icon } from "@/components/icon"
import { cardButtonDark } from "@/components/page-hero"
import { PickMenu } from "@/components/ui/pick-menu"
import { Refresher, ownersOf, sharesOf } from "@/lib/difficulty"
import { fmt } from "@/lib/kpi-summary"
import { SharesEditor } from "./project-score-list"

const QUARTERS = [1, 2, 3, 4] as const

const input =
  "h-10 min-w-0 rounded-[12px] border-[1.5px] border-rule bg-white px-3 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"

/** ttb Refresher lessons by quarter: they count toward KPI but are not on the Timeline */
export function RefresherEditor({
  year,
  refreshers,
  teamMembers,
  points,
  onChange,
}: {
  year: number
  refreshers: Refresher[]
  teamMembers: string[]
  points: number
  onChange: (next: Refresher[]) => void
}) {
  const thisYear = refreshers.filter((r) => r.year === year)
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(() => (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4)
  const [title, setTitle] = useState("")
  const [people, setPeople] = useState<string[]>([])

  const add = () => {
    if (people.length === 0) return
    onChange([
      ...refreshers,
      { id: `ref-${Date.now()}`, year, quarter, title: title.trim(), owner: people.join(" / "), done: false },
    ])
    setTitle("")
    setPeople([])
  }
  const update = (id: string, patch: Partial<Refresher>) =>
    onChange(refreshers.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:px-7">
      <section className="flex flex-col gap-3 rounded-[16px] bg-paper p-4">
        <h3 className="text-sm font-bold">Add a lesson · {year}</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <PickMenu
            label="ไตรมาส"
            value={String(quarter)}
            onChange={(v) => setQuarter(Number(v) as 1 | 2 | 3 | 4)}
            options={QUARTERS.map((q) => ({ value: String(q), label: `Q${q}` }))}
            className="h-10 rounded-[12px] border-[1.5px] border-rule bg-white px-3 text-sm font-semibold text-ink"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ชื่อบทเรียน เช่น ttb ultimate legacy"
            aria-label="ชื่อบทเรียน"
            className={`${input} flex-1 sm:min-w-[260px]`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold">Owner</span>
          {teamMembers.map((m) => {
            const on = people.includes(m)
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => setPeople((prev) => (prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m]))}
                className={`h-9 rounded-full px-3.5 text-sm font-semibold ${on ? "bg-ink text-white" : "bg-white text-ink hover:bg-rule"}`}
              >
                {m}
              </button>
            )
          })}
          <span className="flex-1" />
          <button type="button" onClick={add} disabled={people.length === 0} className={cardButtonDark}>
            <Icon name="plus" size={16} />
            Add
          </button>
        </div>
      </section>

      {QUARTERS.map((q) => {
        const list = thisYear.filter((r) => r.quarter === q)
        return (
          <section key={q} className="overflow-hidden rounded-[16px] border border-rule">
            <h3 className="flex items-center justify-between px-5 pt-4 pb-3 text-base font-bold">
              Q{q} {year}
              <span className="text-[13px] font-normal text-ink-soft">{list.length} lessons</span>
            </h3>
            {list.length === 0 ? (
              <p className="border-t border-rule px-5 py-4 text-sm text-ink-soft">ยังไม่มี</p>
            ) : (
              <ul className="divide-y divide-rule border-t border-rule">
                {list.map((r) => {
                  const owners = ownersOf(r.owner)
                  return (
                    <li key={r.id} className="flex flex-col gap-2.5 px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
                          <input
                            type="checkbox"
                            checked={r.done}
                            onChange={(e) => update(r.id, { done: e.target.checked })}
                            className="h-4 w-4 accent-ink"
                          />
                          Done
                        </label>
                        <input
                          value={r.title}
                          onChange={(e) => update(r.id, { title: e.target.value })}
                          placeholder={`Refresher Q${q}`}
                          aria-label="ชื่อบทเรียน"
                          className={`${input} flex-1`}
                        />
                        <span className="text-[13px] text-ink-soft">{r.owner}</span>
                        <b className="w-12 text-right tabular-nums">{fmt(points)}</b>
                        <button
                          type="button"
                          onClick={() => onChange(refreshers.filter((x) => x.id !== r.id))}
                          aria-label="ลบ"
                          className="touch-target flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-brand-ink"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                      {owners.length > 1 && (
                        <SharesEditor
                          owners={owners}
                          split={sharesOf(r.owner, r.shares)}
                          points={points}
                          onChange={(shares) => update(r.id, { shares })}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
