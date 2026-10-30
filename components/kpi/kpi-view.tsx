"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useProducts } from "@/hooks/use-products"
import { useTeamMembers } from "@/hooks/use-team-members"
import { AdminLoginModal } from "@/components/auth/admin-login-modal"
import { Icon } from "@/components/icon"
import { PickMenu } from "@/components/ui/pick-menu"
import { PageBody, PageHero, card, cardButton, cardButtonDark, heroButton, heroButtonSolid } from "@/components/page-hero"
import { CriteriaSection } from "@/components/kpi/criteria-section"
import { KpiDialog } from "@/components/kpi/kpi-dialog"
import { ProjectRow } from "@/components/kpi/project-score-list"
import { RefresherEditor } from "@/components/kpi/refresher-editor"
import { WeightsForm } from "@/components/kpi/weights-card"
import {
  DifficultyStore,
  EMPTY_DIFFICULTY,
  ProjectFactors,
  collectProjects,
  fetchDifficulty,
  saveDifficulty,
  scoreProject,
} from "@/lib/difficulty"
import { PersonSummary, ScoredProject, fmt, summarize } from "@/lib/kpi-summary"
import { downloadKpiExcel } from "@/lib/kpi-excel"
import { checkIsProjectCompleted, getAvailableYears, getSystemCurrentMonth, parseMonthYear } from "@/lib/timeline-data"
import { toast } from "@/lib/notify"

type Editor = "projects" | "refresher" | "points"
type Filter = "active" | "done" | "all"

/** KPI for admins: one summary page; scoring, Refresher and points open as dialogs */
export function KpiView() {
  const { isAdmin, isAuthLoaded, login } = useAdminAuth()
  const { monthlyStore, getItemsForMonth, isLoaded } = useProducts()
  const { teamMembers, memberColors } = useTeamMembers()
  const [saved, setSaved] = useState<DifficultyStore | null>(null)
  const [draft, setDraft] = useState<DifficultyStore | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [person, setPerson] = useState<PersonSummary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const nowMonth = getSystemCurrentMonth()
  const [year, setYear] = useState(() => parseMonthYear(nowMonth)?.year ?? new Date().getFullYear())
  const [filter, setFilter] = useState<Filter>("active")
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    fetchDifficulty().then((d) => {
      if (alive) setSaved(d ?? EMPTY_DIFFICULTY)
    })
    return () => {
      alive = false
    }
  }, [isAdmin])

  // The page shows saved numbers; an open editor shows its draft
  const base = saved ?? EMPTY_DIFFICULTY
  const data = draft ?? base

  // Projects on the timeline this month, the same list the Timeline page shows
  const activeIds = useMemo(() => {
    const ids = new Set<string>()
    ;[...getItemsForMonth(nowMonth, "product"), ...getItemsForMonth(nowMonth, "enhancement")].forEach((p) => {
      if (!p.isPaused && !checkIsProjectCompleted(p, nowMonth)) ids.add(p.id)
    })
    return ids
  }, [getItemsForMonth, nowMonth])

  const score = (store: DifficultyStore): ScoredProject[] =>
    collectProjects(monthlyStore, nowMonth).map((p) => {
      const factors = store.projects[p.id] || {}
      return {
        ...p,
        factors,
        score: scoreProject(p.item, p.type, factors, store.weights),
        isActiveNow: !p.completed && activeIds.has(p.id),
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const projects = useMemo(() => score(data), [monthlyStore, nowMonth, data, activeIds])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savedProjects = useMemo(() => score(base), [monthlyStore, nowMonth, base, activeIds])
  const summary = useMemo(() => summarize(savedProjects, base.refreshers, base.weights, year), [savedProjects, base, year])

  const doneThisYear = (p: ScoredProject) => Boolean(p.completedMonth && parseMonthYear(p.completedMonth)?.year === year)
  const counts = {
    active: projects.filter((p) => p.isActiveNow).length,
    done: projects.filter(doneThisYear).length,
    all: projects.length,
  }
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects
      .filter((p) => (filter === "active" ? p.isActiveNow : filter === "done" ? doneThisYear(p) : true))
      .filter((p) => !q || `${p.item.name} ${p.item.broker} ${p.item.owner}`.toLowerCase().includes(q))
      .sort((a, b) => b.score.total - a.score.total || a.item.name.localeCompare(b.item.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, filter, query, year])

  const setFactors = (id: string, next: ProjectFactors) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as ProjectFactors
    const projectsNext = { ...data.projects }
    if (Object.keys(clean).length) projectsNext[id] = clean
    else delete projectsNext[id]
    setDraft({ ...data, projects: projectsNext })
  }

  const closeEditor = () => {
    setDraft(null)
    setEditor(null)
  }

  const save = async () => {
    if (!draft) return closeEditor()
    setIsSaving(true)
    const res = await saveDifficulty(draft)
    setIsSaving(false)
    if (res.success) {
      setSaved(draft)
      closeEditor()
      toast.success("บันทึกแล้ว")
    } else {
      toast.error(res.error || "บันทึกไม่สำเร็จ")
    }
  }

  const exportExcel = async () => {
    setIsExporting(true)
    try {
      await downloadKpiExcel(summary, base.weights, year)
    } catch (err) {
      toast.error("สร้างไฟล์ Excel ไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsExporting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHero>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">KPI</h1>
        </PageHero>
        <PageBody>
          <div className={`${card} mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
            {isAuthLoaded ? (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
                  <Icon name="lock" size={28} />
                </span>
                <h2 className="text-lg font-bold">Admin only</h2>
                <button type="button" onClick={() => setIsLoginOpen(true)} className={cardButtonDark}>
                  Admin login
                </button>
              </>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            )}
          </div>
          <AdminLoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onSuccess={() => setIsLoginOpen(false)}
            loginFn={login}
          />
        </PageBody>
      </div>
    )
  }

  const yearOptions = getAvailableYears(monthlyStore).map((y) => ({ value: String(y), label: `${y} (พ.ศ. ${y + 543})` }))
  const loading = !isLoaded || saved === null
  const unconfirmed = savedProjects.filter((p) => p.type === "product" && !p.factors.level).length
  const colorOf = (name: string) =>
    memberColors[name] ||
    memberColors[Object.keys(memberColors).find((k) => k.split(" ")[0] === name.split(" ")[0]) || ""] ||
    "#57534E"
  const editorFooter = (
    <>
      <button type="button" onClick={closeEditor} className={cardButton}>
        Cancel
      </button>
      <button type="button" onClick={save} disabled={isSaving || !draft} className={cardButtonDark}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={17} strokeWidth={2.4} />}
        Save
      </button>
    </>
  )

  return (
    <div>
      <PageHero>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PickMenu
              label="Year"
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={yearOptions}
              className="h-10 rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setEditor("refresher")} disabled={loading} className={heroButton}>
                <Icon name="training" size={18} />
                Refresher
              </button>
              <button type="button" onClick={exportExcel} disabled={loading || isExporting} className={heroButton}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
                Excel
              </button>
              <button type="button" onClick={() => setEditor("projects")} disabled={loading} className={heroButtonSolid}>
                <Icon name="edit" size={18} />
                Score projects
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="text-lg font-semibold">KPI · {year}</div>
              <div className="flex items-end gap-4">
                <span className="text-[88px] leading-[0.82] font-bold tracking-[-0.04em] tabular-nums sm:text-[124px]">
                  {fmt(summary.team.donePoints)}
                </span>
                <span className="pb-1.5 text-2xl leading-tight font-bold sm:text-[28px]">
                  points
                  <br />
                  completed
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 font-bold text-brand-ink">
              <Icon name="inProgress" size={22} strokeWidth={2} />
              {fmt(summary.team.loadPoints)} points in progress
            </span>
          </div>
        </div>
      </PageHero>

      <PageBody className="flex flex-col gap-5">
        {loading ? (
          <div className={`${card} flex justify-center py-10`}>
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : (
          <>
            {unconfirmed > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all")
                  setEditor("projects")
                }}
                className={`${card} flex items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-surface`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
                  <Icon name="warning" size={18} />
                </span>
                <span className="flex-1">
                  <b>{unconfirmed} projects</b> ยังใช้ประเภทที่เดาจากชื่อ กดเพื่อยืนยัน
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            )}

            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-white text-ink shadow-[var(--shadow-card)]">
                  <Icon name="team" size={18} />
                </span>
                Points by owner
              </h2>
              {summary.people.length === 0 ? (
                <div className={`${card} px-5 py-6 text-sm text-ink-soft`}>ไม่มีข้อมูล</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {summary.people.map((p) => (
                    <PersonCard key={p.name} person={p} year={year} color={colorOf(p.name)} onOpen={() => setPerson(p)} />
                  ))}
                </div>
              )}
            </section>

            <CriteriaSection weights={base.weights} onEdit={() => setEditor("points")} />
          </>
        )}
      </PageBody>

      {editor === "projects" && (
        <KpiDialog
          wide
          icon="edit"
          title="Score projects"
          subtitle="เลือกประเภทและคะแนนเพิ่มของแต่ละงาน แล้วกด Save"
          onClose={closeEditor}
          footer={editorFooter}
          toolbar={
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex gap-0.5 rounded-full bg-surface p-[3px]">
                {([
                  ["active", `In progress (${counts.active})`],
                  ["done", `Completed ${year} (${counts.done})`],
                  ["all", `All (${counts.all})`],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={filter === v}
                    onClick={() => setFilter(v)}
                    className={`h-8 rounded-full px-3.5 text-[13px] font-semibold ${filter === v ? "bg-ink text-white" : "text-ink-soft hover:bg-rule"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[280px]">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
                  <Icon name="search" size={16} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหางาน ช่องทาง หรือคน"
                  aria-label="ค้นหา"
                  className="h-9 w-full rounded-full border-[1.5px] border-rule bg-white pr-3 pl-9 text-sm focus:border-ink focus:outline-none"
                />
              </label>
            </div>
          }
        >
          {listed.length === 0 ? (
            <p className="px-7 py-6 text-sm text-ink-soft">ไม่มีงาน</p>
          ) : (
            <ul className="divide-y divide-rule">
              {listed.map((p) => (
                <ProjectRow key={p.id} project={p} onChange={(f) => setFactors(p.id, f)} />
              ))}
            </ul>
          )}
        </KpiDialog>
      )}

      {editor === "refresher" && (
        <KpiDialog
          icon="training"
          title={`Refresher · ${year}`}
          subtitle="บทเรียนทบทวนรายไตรมาสของ ttb นับคะแนนใน KPI แต่ไม่แสดงใน Timeline"
          onClose={closeEditor}
          footer={editorFooter}
        >
          <RefresherEditor
            year={year}
            refreshers={data.refreshers}
            teamMembers={teamMembers}
            points={data.weights.refresher}
            onChange={(refreshers) => setDraft({ ...data, refreshers })}
          />
        </KpiDialog>
      )}

      {editor === "points" && (
        <KpiDialog
          icon="edit"
          title="Edit points"
          subtitle="เปลี่ยนแล้วคะแนนของทุกงานคิดใหม่ทันที"
          onClose={closeEditor}
          footer={editorFooter}
        >
          <WeightsForm weights={data.weights} onChange={(weights) => setDraft({ ...data, weights })} />
        </KpiDialog>
      )}

      {person && <PersonDialog person={person} year={year} onClose={() => setPerson(null)} />}
    </div>
  )
}

const quarterOf = (months: number[], q: number) => months.slice(q * 3, q * 3 + 3).reduce((s, v) => s + v, 0)

/** One person: points completed this year, by quarter, and points in progress */
function PersonCard({
  person: p,
  year,
  color,
  onOpen,
}: {
  person: PersonSummary
  year: number
  color: string
  onOpen: () => void
}) {
  const quarters = [0, 1, 2, 3].map((q) => quarterOf(p.doneByMonth, q))
  const max = Math.max(1, ...quarters)
  return (
    <button type="button" onClick={onOpen} className={`${card} flex flex-col gap-4 p-5 text-left hover:shadow-[0_2px_4px_rgba(41,37,36,.06),0_12px_28px_-12px_rgba(41,37,36,.22)]`}>
      <span className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: color }}
        >
          {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </span>
        <b className="min-w-0 flex-1 truncate">{p.name}</b>
        <span className="text-ink-soft">
          <Icon name="chevronRight" size={18} />
        </span>
      </span>
      <span className="flex items-end justify-between gap-3">
        <span>
          <span className="block text-xs font-semibold text-done">Completed {year}</span>
          <span className="block text-[40px] leading-none font-bold tabular-nums">{fmt(p.donePoints)}</span>
          <span className="block text-xs text-ink-soft">{p.doneCount} งาน</span>
        </span>
        <span className="text-right">
          <span className="block text-xs font-semibold text-brand-ink">In progress</span>
          <span className="block text-2xl leading-tight font-bold tabular-nums">{fmt(p.loadPoints)}</span>
          <span className="block text-xs text-ink-soft">{p.loadCount} งาน</span>
        </span>
      </span>
      <span className="grid grid-cols-4 gap-2" aria-label="คะแนนรายไตรมาส">
        {quarters.map((v, i) => (
          <span key={i} className="flex flex-col items-center gap-1">
            <span className="flex h-12 w-full items-end overflow-hidden rounded-[8px] bg-surface">
              <span className="w-full rounded-[8px] bg-done" style={{ height: `${(v / max) * 100}%` }} />
            </span>
            <span className="text-[11px] text-ink-soft tabular-nums">
              Q{i + 1} · <b className="text-ink">{fmt(v)}</b>
            </span>
          </span>
        ))}
      </span>
    </button>
  )
}

/** Every piece of work behind a person's points */
function PersonDialog({ person: p, year, onClose }: { person: PersonSummary; year: number; onClose: () => void }) {
  return (
    <KpiDialog
      wide
      icon="user"
      title={p.name}
      subtitle={`Completed ${year}: ${fmt(p.donePoints)} pts · In progress: ${fmt(p.loadPoints)} pts`}
      onClose={onClose}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-rule text-xs font-semibold text-ink-soft">
              <th scope="col" className="px-7 py-2 text-left">Project</th>
              <th scope="col" className="px-2 py-2 text-left">Level</th>
              <th scope="col" className="px-2 py-2 text-left">Status</th>
              <th scope="col" className="px-2 py-2 text-right">Points</th>
              <th scope="col" className="px-2 py-2 text-right">Share</th>
              <th scope="col" className="px-7 py-2 text-right">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {p.rows.map((r, i) => (
              <tr key={i}>
                <td className="px-7 py-3">
                  <span className="block font-semibold">{r.name}</span>
                  <span className="text-xs text-ink-soft">
                    {r.kind} · {r.channel}
                    {r.elearning && " · e-Learning"}
                  </span>
                </td>
                <td className="px-2 py-3">{r.level}</td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${r.done ? "bg-done-soft text-done" : "bg-pru-red-soft text-brand-ink"}`}
                  >
                    {r.done ? r.when : "In progress"}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">{fmt(r.points)}</td>
                <td className="px-2 py-3 text-right">{Math.round(r.share * 100)}%</td>
                <td className="px-7 py-3 text-right font-bold">{fmt(Math.round(r.myPoints * 10) / 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </KpiDialog>
  )
}
