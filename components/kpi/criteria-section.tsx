"use client"

import * as React from "react"
import { Icon, IconName } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { DifficultyWeights, LEVEL_LABEL, Level } from "@/lib/difficulty"
import { fmt } from "@/lib/kpi-summary"

const LEVELS: { level: Level; types: string; dot: string }[] = [
  { level: "high", types: "Unit link · Health · Index link", dot: "bg-pru-red" },
  { level: "medium", types: "Whole life · Saving", dot: "bg-[#F8B4BB]" },
  { level: "low", types: "Enhancement", dot: "bg-stone-300" },
]

/** A numbered list panel: name and Thai note on the left, points on the right */
function Panel({ step, title, note, children }: { step: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[16px] border border-rule">
      <div className="flex items-center gap-3 border-b border-rule px-5 py-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
          {step}
        </span>
        <div>
          <div className="text-[15px] font-bold">{title}</div>
          <div className="text-[13px] text-ink-soft">{note}</div>
        </div>
      </div>
      <ul className="divide-y divide-rule">{children}</ul>
    </div>
  )
}

function Row({ lead, title, note, points, sub }: { lead: React.ReactNode; title: string; note: string; points: string; sub?: string }) {
  return (
    <li className="flex items-center gap-3.5 px-5 py-3">
      {lead}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[13px] leading-snug text-ink-soft">{note}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xl leading-tight font-bold tabular-nums">{points}</div>
        {sub && <div className="text-xs text-ink-soft tabular-nums">{sub}</div>}
      </div>
    </li>
  )
}

const iconLead = (name: IconName) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-ink">
    <Icon name={name} size={18} />
  </span>
)

/** How the team's points are counted, written so the owner can walk the team through it */
export function CriteriaSection({ weights: w, onEdit }: { weights: DifficultyWeights; onEdit: () => void }) {
  const example = w.high + w.elearning
  const formula: { label: string; note: string }[] = [
    { label: "Type", note: "ประเภทของงาน" },
    { label: "Extras", note: "งานที่ทำเพิ่ม" },
    { label: "Project points", note: "คะแนนของงาน" },
  ]
  const rules: { icon: IconName; text: string }[] = [
    { icon: "completed", text: "นับเมื่องานเสร็จ ในเดือนที่เสร็จ" },
    { icon: "inProgress", text: "งานที่ยังไม่เสร็จ แยกนับเป็น In progress" },
    { icon: "team", text: "ทำหลายคน แบ่งตาม % ที่ตั้งไว้ (เริ่มต้นแบ่งเท่ากัน)" },
    { icon: "onHold", text: "On hold ไม่นับ จนกว่าจะทำต่อ" },
  ]

  return (
    <section className={`${card} flex flex-col gap-5 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
            <Icon name="info" size={18} />
          </span>
          How points work
        </h2>
        <button type="button" onClick={onEdit} className={cardButton}>
          <Icon name="edit" size={16} />
          Edit points
        </button>
      </div>

      {/* The whole rule in one line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] bg-paper px-5 py-4">
        {formula.map((f, i) => (
          <React.Fragment key={f.label}>
            {i > 0 && <span className="text-2xl font-bold text-ink-soft">{i === 1 ? "+" : "="}</span>}
            <span
              className={`flex flex-col rounded-[12px] px-4 py-2 ${i === 2 ? "bg-pru-red text-white" : "bg-white shadow-[var(--shadow-card)]"}`}
            >
              <span className="text-sm font-bold">
                {i < 2 && <span className="text-brand-ink">{i + 1} · </span>}
                {f.label}
              </span>
              <span className={`text-xs ${i === 2 ? "text-white/85" : "text-ink-soft"}`}>{f.note}</span>
            </span>
          </React.Fragment>
        ))}
        <span className="text-[13px] text-ink-soft sm:ml-2">แล้วแบ่งให้ผู้รับผิดชอบตาม %</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel step={1} title="Type" note="เลือกได้ 1 ประเภทต่องาน">
          {LEVELS.map((l) => (
            <Row
              key={l.level}
              lead={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface">
                  <span className={`h-3.5 w-3.5 rounded-full ${l.dot}`} />
                </span>
              }
              title={LEVEL_LABEL[l.level]}
              note={l.types}
              points={fmt(w[l.level])}
            />
          ))}
        </Panel>

        <Panel step={2} title="Extras" note="บวกเพิ่มได้หลายข้อ">
          <Row lead={iconLead("elearning")} title="e-Learning" note="งานช่องทาง ttb มีเสมอ" points={`+${fmt(w.elearning)}`} />
          <Row lead={iconLead("draft")} title="New content" note="เขียนใหม่ทั้งหมด ไม่ได้ปรับจากของเดิม" points={`+${fmt(w.newContent)}`} />
          <Row
            lead={iconLead("folder")}
            title="Audit"
            note="แก้ไฟล์เก่า: ประสานงาน 1 ครั้ง และตามจำนวนไฟล์"
            points={`+${fmt(w.audit)}`}
            sub={`+${fmt(w.perFile)} ต่อไฟล์`}
          />
          <Row lead={iconLead("edit")} title="Adjust" note="ปรับเพิ่มหรือลดทีละงาน" points="±1" />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2.5 rounded-[16px] border border-rule px-5 py-4">
          <div className="text-[15px] font-bold">How we count</div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {rules.map((r) => (
              <li key={r.text} className="flex items-start gap-2.5 text-sm leading-snug">
                <span className="mt-px shrink-0 text-ink-soft">
                  <Icon name={r.icon} size={18} />
                </span>
                {r.text}
              </li>
            ))}
            <li className="flex items-start gap-2.5 text-sm leading-snug sm:col-span-2">
              <span className="mt-px shrink-0 text-ink-soft">
                <Icon name="training" size={18} />
              </span>
              Refresher ของ ttb ได้บทเรียนละ {fmt(w.refresher)} คะแนน
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-[16px] bg-paper px-5 py-4">
          <div>
            <div className="text-[15px] font-bold">Example</div>
            <div className="text-[13px] text-ink-soft">งาน ttb แบบ Index link ทำ 2 คน แบ่ง 50/50</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-[var(--shadow-card)]">
              High {fmt(w.high)}
            </span>
            <span className="font-bold text-ink-soft">+</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-[var(--shadow-card)]">
              e-Learning {fmt(w.elearning)}
            </span>
            <span className="font-bold text-ink-soft">=</span>
            <span className="rounded-full bg-pru-red px-3.5 py-1.5 text-sm font-bold text-white">{fmt(example)} pts</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon name="team" size={17} />
            ได้คนละ <b className="tabular-nums">{fmt(example / 2)}</b> คะแนน
          </div>
        </div>
      </div>
    </section>
  )
}
