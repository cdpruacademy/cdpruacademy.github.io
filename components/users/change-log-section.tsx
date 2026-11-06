"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { shortLogin } from "@/lib/access"
import { ChangeLogEntry, fetchChangeLog } from "@/lib/supabase"

const PAGE_SIZE = 100

const ACTION: Record<ChangeLogEntry["action"], string> = {
  add: "เพิ่ม",
  edit: "แก้ไข",
  delete: "ลบ",
  pause: "พักงาน",
  resume: "กลับมาทำ",
}

const FIELD: Record<string, string> = {
  name: "ชื่อ",
  owner: "Owner",
  broker: "Channel",
  internalDate: "Internal Date",
  commercialDate: "Launch",
  csDate: "CS Date",
  customRightLabel: "Launch label",
}

const STEP: Record<string, string> = {
  "kick-off": "Kick-off",
  "first-draft": "First Draft",
  "first-draft-elearning": "First Draft e-learning",
  "final-approval": "Final Approval",
  "final-elearning": "Final e-learning",
  "internal-training": "Internal Training",
  launch: "Launch",
}

const STEP_PART: Record<string, string> = { date: "วันที่", status: "สถานะ", isElearningIcon: "Current" }

const fieldLabel = (field: string) => {
  const [, step, part] = field.split(".")
  return part ? `${STEP[step] ?? step} ${STEP_PART[part] ?? part}` : FIELD[field] ?? field
}

const value = (v: string | null) => (v === null || v === "" ? "–" : v === "true" ? "ใช่" : v === "false" ? "ไม่ใช่" : v)

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })

/** Who changed which project on the Timeline, newest first */
export function ChangeLogSection() {
  const [entries, setEntries] = useState<ChangeLogEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Only the newest search may show its result
  const searchId = useRef(0)

  const search = useCallback(async (q: string) => {
    const id = ++searchId.current
    const list = await fetchChangeLog(q, PAGE_SIZE)
    if (id !== searchId.current) return
    setFailed(list === null)
    setEntries(list ?? [])
    setHasMore((list?.length ?? 0) === PAGE_SIZE)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void search(query), query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query, search])

  const loadMore = async () => {
    if (!entries?.length) return
    setIsLoadingMore(true)
    const more = await fetchChangeLog(query, PAGE_SIZE, entries[entries.length - 1].id)
    setIsLoadingMore(false)
    if (more) {
      setEntries([...entries, ...more])
      setHasMore(more.length === PAGE_SIZE)
    }
  }

  return (
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">ประวัติการแก้ไข</h2>
        <label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
            <Icon name="search" size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา project หรือผู้แก้"
            aria-label="ค้นหาประวัติ"
            className="h-10 w-full rounded-full border-[1.5px] border-rule bg-white pr-3 pl-9 text-sm focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      {entries === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
      ) : failed ? (
        <p role="alert" className="py-6 text-center text-sm font-semibold text-brand-ink">
          อ่านประวัติไม่สำเร็จ
        </p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-stone-700">ยังไม่มีประวัติ</p>
      ) : (
        <ul className="divide-y divide-surface">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <b className="min-w-0 text-[15px] font-semibold text-ink">{e.project_name || e.project_id}</b>
                <span className="text-[13px] whitespace-nowrap text-ink-soft tabular-nums">{when(e.changed_at)}</span>
              </div>
              <span className="text-[13px] text-ink-soft">
                <b className="font-semibold text-ink">{shortLogin(e.actor)}</b> · {ACTION[e.action]}
                {e.month && ` · ${e.month}`}
              </span>
              {e.changes.length > 0 && (
                <ul className="mt-0.5 flex flex-col gap-0.5 text-[13px] text-ink">
                  {e.changes.map((c) => (
                    <li key={c.field}>
                      <span className="font-semibold">{fieldLabel(c.field)}:</span> {value(c.from)} → {value(c.to)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button type="button" onClick={loadMore} disabled={isLoadingMore} className={`${cardButton} self-center`}>
          {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          โหลดเพิ่ม
        </button>
      )}
    </section>
  )
}
