"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { KpiDialog } from "@/components/kpi/kpi-dialog"
import { SharesEditor } from "@/components/kpi/project-score-list"
import { cardButton, cardButtonDark } from "@/components/page-hero"
import { DatePicker } from "@/components/ui/date-picker"
import { AuditWork, auditPeriod, fetchAudits, ownersOf, saveAudits, sharesOf } from "@/lib/difficulty"
import { toast } from "@/lib/notify"

const input =
  "h-10 min-w-0 rounded-[12px] border-[1.5px] border-rule bg-white px-3 text-sm text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"

const toFiles = (value: string) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Audit work is entered here only, so it never reaches the Timeline, the LINE images or the bot */
export function AuditDialog({
  year,
  teamMembers,
  onClose,
}: {
  year: number
  teamMembers: string[]
  onClose: () => void
}) {
  const [saved, setSaved] = useState<AuditWork[] | null>(null)
  const [draft, setDraft] = useState<AuditWork[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [files, setFiles] = useState("")
  const [date, setDate] = useState("")
  const [people, setPeople] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    fetchAudits().then((list) => {
      if (!alive) return
      setSaved(list)
      setFailed(list === null)
    })
    return () => {
      alive = false
    }
  }, [])

  const all = draft ?? saved ?? []
  const shown = all.filter((a) => auditPeriod(a).year === year)
  const change = (next: AuditWork[]) => setDraft(next)
  const update = (id: string, patch: Partial<AuditWork>) =>
    change(all.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const add = () => {
    if (!title.trim() || people.length === 0) return
    change([
      ...all,
      {
        id: `audit-${Date.now()}`,
        year,
        title: title.trim(),
        owner: people.join(" / "),
        date,
        files: toFiles(files),
        done: false,
      },
    ])
    setTitle("")
    setFiles("")
    setDate("")
    setPeople([])
  }

  const save = async () => {
    if (!draft) return onClose()
    setIsSaving(true)
    const res = await saveAudits(draft)
    setIsSaving(false)
    if (res.success) {
      toast.success("บันทึกแล้ว")
      onClose()
    } else {
      toast.error(res.error || "บันทึกไม่สำเร็จ")
    }
  }

  return (
    <KpiDialog
      wide
      icon="approval"
      title={`Audit · ${year}`}
      subtitle="นับใน Analytics และ KPI ไม่แสดงใน Timeline"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cardButton}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={isSaving || !draft} className={cardButtonDark}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={17} strokeWidth={2.4} />}
            Save
          </button>
        </>
      }
    >
      {saved ? (
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-7">
          <section className="flex flex-col gap-3 rounded-[16px] bg-paper p-4">
            <h3 className="text-sm font-bold">Add Audit work</h3>
            <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_90px_220px]">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ชื่องาน เช่น Periodic Review 2026"
                aria-label="ชื่องาน"
                className={input}
              />
              <input
                type="number"
                min={0}
                max={5000}
                value={files}
                onChange={(e) => setFiles(e.target.value)}
                placeholder="ไฟล์"
                aria-label="จำนวนไฟล์"
                className={`${input} tabular-nums`}
              />
              <DatePicker value={date} onChange={setDate} placeholder="วันส่งงาน" allowTBC defaultMonth={new Date()} />
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
              <button type="button" onClick={add} disabled={!title.trim() || people.length === 0} className={cardButtonDark}>
                <Icon name="plus" size={16} />
                Add
              </button>
            </div>
          </section>

          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">ยังไม่มีงาน Audit ในปีนี้</p>
          ) : (
            <ul className="divide-y divide-rule overflow-hidden rounded-[16px] border border-rule">
              {shown.map((a) => {
                const owners = ownersOf(a.owner)
                const hasDate = auditPeriod(a).monthIndex !== null
                return (
                  <li key={a.id} className="flex flex-col gap-2.5 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <input
                        value={a.title}
                        onChange={(e) => update(a.id, { title: e.target.value })}
                        aria-label="ชื่องาน"
                        className={`${input} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => change(all.filter((x) => x.id !== a.id))}
                        aria-label={`ลบ ${a.title}`}
                        className="touch-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-brand-ink"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        ไฟล์
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          value={a.files || ""}
                          placeholder="0"
                          onChange={(e) => update(a.id, { files: toFiles(e.target.value) })}
                          className={`${input} h-9 w-20 text-right tabular-nums`}
                        />
                      </label>
                      <div className="flex w-[220px] items-center">
                        <DatePicker
                          value={a.date || ""}
                          onChange={(val) => update(a.id, { date: val })}
                          placeholder="วันส่งงาน"
                          allowTBC
                          defaultMonth={new Date()}
                        />
                      </div>
                      <label
                        className={`inline-flex items-center gap-2 text-[13px] font-semibold ${hasDate ? "" : "text-ink-soft"}`}
                        title={hasDate ? undefined : "ใส่วันส่งงานก่อน"}
                      >
                        <input
                          type="checkbox"
                          checked={a.done && hasDate}
                          disabled={!hasDate}
                          onChange={(e) => update(a.id, { done: e.target.checked })}
                          className="h-4 w-4 accent-ink"
                        />
                        Done
                      </label>
                      <span className="text-[13px] text-ink-soft">{a.owner}</span>
                    </div>
                    {owners.length > 1 && (
                      <SharesEditor
                        owners={owners}
                        split={sharesOf(a.owner, a.shares)}
                        onChange={(shares) => update(a.id, { shares })}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : failed ? (
        <p role="alert" className="px-7 py-10 text-center text-sm font-semibold text-brand-ink">
          อ่านข้อมูลไม่สำเร็จ กรุณาปิดแล้วลองใหม่
        </p>
      ) : (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
      )}
    </KpiDialog>
  )
}
