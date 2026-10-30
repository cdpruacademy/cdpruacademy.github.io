"use client"

import * as React from "react"
import { Icon, IconName } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { DifficultyWeights, LEVEL_LABEL, Level } from "@/lib/difficulty"
import { fmt } from "@/lib/kpi-summary"

const LEVELS: { level: Level; icon: IconName; types: string; tone: string }[] = [
  { level: "high", icon: "product", types: "Unit link · Health · Index link", tone: "bg-pru-red text-white" },
  { level: "medium", icon: "product", types: "Whole life · Saving", tone: "bg-pru-red-soft text-brand-ink" },
  { level: "low", icon: "wrench", types: "Enhancement", tone: "bg-surface text-ink" },
]

/** How the team's points are counted, written so the owner can walk the team through it */
export function CriteriaSection({ weights: w, onEdit }: { weights: DifficultyWeights; onEdit: () => void }) {
  const extras: { icon: IconName; title: string; points: string; note: string }[] = [
    { icon: "elearning", title: "e-Learning", points: `+${fmt(w.elearning)}`, note: "งานช่องทาง ttb มี e-Learning เสมอ" },
    { icon: "draft", title: "New content", points: `+${fmt(w.newContent)}`, note: "เขียนเนื้อหาใหม่ทั้งหมด ไม่ได้ปรับจากของเดิม" },
    {
      icon: "folder",
      title: "Audit",
      points: `+${fmt(w.audit)} และ +${fmt(w.perFile)}/ไฟล์`,
      note: "งานแก้ไฟล์เก่า: คะแนนประสานงาน 1 ครั้ง บวกตามจำนวนไฟล์ที่แก้",
    },
    { icon: "training", title: "Refresher", points: `${fmt(w.refresher)}/บทเรียน`, note: "บทเรียนทบทวนรายไตรมาสของ ttb" },
    { icon: "edit", title: "Adjust", points: "±1", note: "ปรับเพิ่มหรือลดได้ทีละงาน" },
  ]
  const rules = [
    "นับคะแนนเมื่องานเสร็จ เข้าเดือนที่งานเสร็จ",
    "งานที่ยังไม่เสร็จนับแยกเป็น In progress เพื่อดูภาระงานตอนนี้",
    "งานที่ทำหลายคน แบ่งคะแนนตาม % ที่ตั้งไว้ ถ้าไม่ได้ตั้งแบ่งเท่ากัน",
    "งานที่ On hold ไม่นับจนกว่าจะทำต่อ",
  ]
  const ttbExample = w.high + w.elearning

  return (
    <section className={`${card} flex flex-col gap-6 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-[19px] font-bold">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
              <Icon name="info" size={18} />
            </span>
            How points work
          </h2>
          <p className="mt-1 text-sm text-ink-soft">คะแนนของแต่ละงาน = คะแนนตามประเภท + คะแนนเพิ่ม</p>
        </div>
        <button type="button" onClick={onEdit} className={cardButton}>
          <Icon name="edit" size={16} />
          Edit points
        </button>
      </div>

      <div>
        <h3 className="mb-2.5 text-[13px] font-semibold text-ink-soft">1 · คะแนนตามประเภท</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <div key={l.level} className={`flex items-center justify-between gap-3 rounded-[16px] px-5 py-4 ${l.tone}`}>
              <div className="min-w-0">
                <div className="text-sm font-bold">{LEVEL_LABEL[l.level]}</div>
                <div className="text-[13px] opacity-85">{l.types}</div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[40px] leading-none font-bold tabular-nums">{fmt(w[l.level])}</span>
                <span className="block text-xs opacity-85">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2.5 text-[13px] font-semibold text-ink-soft">2 · คะแนนเพิ่ม</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {extras.map((e) => (
            <div key={e.title} className="flex flex-col gap-2 rounded-[16px] border border-rule px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink">
                  <Icon name={e.icon} size={17} />
                </span>
                <b className="text-sm tabular-nums">{e.points}</b>
              </div>
              <div className="text-sm font-bold">{e.title}</div>
              <div className="text-[13px] leading-snug text-ink-soft">{e.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h3 className="mb-2.5 text-[13px] font-semibold text-ink-soft">3 · วิธีนับ</h3>
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 text-done">
                  <Icon name="check" size={16} strokeWidth={2.6} />
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[16px] bg-paper px-5 py-4">
          <div className="text-[13px] font-semibold text-ink-soft">ตัวอย่าง</div>
          <div className="mt-1 text-sm">ttb Index link ทำ 2 คน แบ่ง 50/50</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
            <span>High {fmt(w.high)}</span>
            <span className="text-ink-soft">+</span>
            <span>e-Learning {fmt(w.elearning)}</span>
            <span className="text-ink-soft">=</span>
            <b className="text-lg">{fmt(ttbExample)}</b>
          </div>
          <div className="mt-1 text-[13px] text-ink-soft">ได้คนละ {fmt(ttbExample / 2)} คะแนน</div>
        </div>
      </div>
    </section>
  )
}
