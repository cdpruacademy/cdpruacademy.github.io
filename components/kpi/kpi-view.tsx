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
import { PageBody, PageHero, card, cardButtonDark, heroButton, heroButtonSolid } from "@/components/page-hero"
import { ProjectRow } from "@/components/kpi/project-score-list"
import { RefresherTab } from "@/components/kpi/refresher-tab"
import { WeightsCard } from "@/components/kpi/weights-card"
import {
  DifficultyStore,
  EMPTY_DIFFICULTY,
  ProjectFactors,
  collectProjects,
  fetchDifficulty,
  saveDifficulty,
  scoreProject,
} from "@/lib/difficulty"
import { ScoredProject, fmt, summarize } from "@/lib/kpi-summary"
import { downloadKpiExcel } from "@/lib/kpi-excel"
import { checkIsProjectCompleted, getAvailableYears, getSystemCurrentMonth, parseMonthYear } from "@/lib/timeline-data"
import { toast } from "@/lib/notify"

type Tab = "summary" | "projects" | "refresher" | "settings"
type Filter = "active" | "done" | "all"

const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "สรุป" },
  { id: "projects", label: "ให้คะแนนงาน" },
  { id: "refresher", label: "Refresher" },
  { id: "settings", label: "ตั้งค่าคะแนน" },
]

/** KPI for admins: difficulty points per project and per person */
export function KpiView() {
  const { isAdmin, isAuthLoaded, login } = useAdminAuth()
  const { monthlyStore, getItemsForMonth, isLoaded } = useProducts()
  const { teamMembers, memberColors } = useTeamMembers()
  const [saved, setSaved] = useState<DifficultyStore | null>(null)
  const [draft, setDraft] = useState<DifficultyStore | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const nowMonth = getSystemCurrentMonth()
  const [year, setYear] = useState(() => parseMonthYear(nowMonth)?.year ?? new Date().getFullYear())
  const [tab, setTab] = useState<Tab>("summary")
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

  const data = draft ?? saved ?? EMPTY_DIFFICULTY
  const isDirty = draft !== null

  // Projects on the timeline this month, the same list the Timeline page shows
  const activeIds = useMemo(() => {
    const ids = new Set<string>()
    ;[...getItemsForMonth(nowMonth, "product"), ...getItemsForMonth(nowMonth, "enhancement")].forEach((p) => {
      if (!p.isPaused && !checkIsProjectCompleted(p, nowMonth)) ids.add(p.id)
    })
    return ids
  }, [getItemsForMonth, nowMonth])

  const projects: ScoredProject[] = useMemo(
    () =>
      collectProjects(monthlyStore, nowMonth).map((p) => {
        const factors = data.projects[p.id] || {}
        return {
          ...p,
          factors,
          score: scoreProject(p.item, p.type, factors, data.weights),
          isActiveNow: !p.completed && activeIds.has(p.id),
        }
      }),
    [monthlyStore, nowMonth, data, activeIds]
  )

  const summary = useMemo(() => summarize(projects, data.refreshers, data.weights, year), [projects, data, year])

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

  const save = async () => {
    if (!draft) return
    setIsSaving(true)
    const res = await saveDifficulty(draft)
    setIsSaving(false)
    if (res.success) {
      setSaved(draft)
      setDraft(null)
      toast.success("บันทึกแล้ว")
    } else {
      toast.error(res.error || "บันทึกไม่สำเร็จ")
    }
  }

  const exportExcel = async () => {
    setIsExporting(true)
    try {
      await downloadKpiExcel(summary, data.weights, year)
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

  const yearOptions = getAvailableYears(monthlyStore).map((y) => ({ value: String(y), label: String(y) }))
  const loading = !isLoaded || saved === null

  return (
    <div className={isDirty ? "pb-24" : ""}>
      <PageHero>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">KPI</h1>
            <div className="flex flex-wrap gap-2">
              <PickMenu
                label="Year"
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                options={yearOptions}
                className="h-10 w-fit rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
              />
              <button type="button" onClick={exportExcel} disabled={loading || isExporting} className={heroButton}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
                Excel
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <div className="text-sm">คะแนนงานเสร็จ {year}</div>
              <div className="text-[44px] leading-none font-bold tabular-nums">{fmt(summary.team.donePoints)}</div>
            </div>
            <div>
              <div className="text-sm">คะแนนงานที่กำลังทำ</div>
              <div className="text-[44px] leading-none font-bold tabular-nums">{fmt(summary.team.loadPoints)}</div>
            </div>
          </div>
        </div>
      </PageHero>

      <PageBody className="flex flex-col gap-5">
        <div role="tablist" aria-label="KPI" className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-rule p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === t.id ? "bg-white text-ink shadow-[var(--shadow-card)]" : "text-ink-soft hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`${card} flex justify-center py-10`}>
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : tab === "summary" ? (
          <SummaryTab summary={summary} year={year} colors={memberColors} />
        ) : tab === "projects" ? (
          <section className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-2.5 px-5 pt-5 pb-3">
              <div className="flex gap-0.5 rounded-full bg-surface p-[3px]">
                {([
                  ["active", `กำลังทำ (${counts.active})`],
                  ["done", `เสร็จปี ${year} (${counts.done})`],
                  ["all", `ทั้งหมด (${counts.all})`],
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
            {listed.length === 0 ? (
              <p className="border-t border-rule px-5 py-6 text-sm text-ink-soft">ไม่มีงาน</p>
            ) : (
              <ul className="divide-y divide-rule border-t border-rule">
                {listed.map((p) => (
                  <ProjectRow key={p.id} project={p} onChange={(f) => setFactors(p.id, f)} />
                ))}
              </ul>
            )}
          </section>
        ) : tab === "refresher" ? (
          <RefresherTab
            year={year}
            refreshers={data.refreshers}
            teamMembers={teamMembers}
            points={data.weights.refresher}
            onChange={(refreshers) => setDraft({ ...data, refreshers })}
          />
        ) : (
          <WeightsCard weights={data.weights} onChange={(weights) => setDraft({ ...data, weights })} />
        )}
      </PageBody>

      {/* Changes stay here until saved */}
      {isDirty && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-white shadow-[0_12px_32px_-12px_rgba(28,25,23,0.6)]">
            <span className="text-sm font-semibold">ยังไม่ได้บันทึก</span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="h-10 rounded-full px-4 text-sm font-semibold text-white/80 hover:text-white"
              >
                ยกเลิก
              </button>
              <button type="button" onClick={save} disabled={isSaving} className={heroButtonSolid}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={18} strokeWidth={2.4} />}
                บันทึก
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** One card per person, then points by quarter */
function SummaryTab({
  summary,
  year,
  colors,
}: {
  summary: ReturnType<typeof summarize>
  year: number
  colors: Record<string, string>
}) {
  const { people } = summary
  if (people.length === 0) return <div className={`${card} px-5 py-6 text-sm text-ink-soft`}>ไม่มีข้อมูล</div>
  const quarter = (m: number[], q: number) => m.slice(q * 3, q * 3 + 3).reduce((s, v) => s + v, 0)
  const colorOf = (name: string) =>
    colors[name] || colors[Object.keys(colors).find((k) => k.split(" ")[0] === name.split(" ")[0]) || ""] || "#57534E"

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {people.map((p) => (
          <section key={p.name} className={`${card} flex flex-col gap-4 p-5`}>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: colorOf(p.name) }}
              >
                {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              <b className="truncate">{p.name}</b>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-done">งานเสร็จ {year}</div>
                <div className="text-[34px] leading-none font-bold tabular-nums">{fmt(p.donePoints)}</div>
                <div className="text-xs text-ink-soft">{p.doneCount} งาน</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-brand-ink">กำลังทำ</div>
                <div className="text-[34px] leading-none font-bold tabular-nums">{fmt(p.loadPoints)}</div>
                <div className="text-xs text-ink-soft">{p.loadCount} งาน</div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className={`${card} overflow-hidden`}>
        <h2 className="px-5 pt-5 pb-3 text-lg font-bold">คะแนนงานเสร็จรายไตรมาส · {year}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead>
              <tr className="border-y border-rule text-xs font-semibold text-ink-soft">
                <th scope="col" className="px-5 py-2 text-left">คน</th>
                {[1, 2, 3, 4].map((q) => (
                  <th key={q} scope="col" className="px-3 py-2 text-right">Q{q}</th>
                ))}
                <th scope="col" className="px-5 py-2 text-right">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {people.map((p) => (
                <tr key={p.name}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold whitespace-nowrap">{p.name}</th>
                  {[0, 1, 2, 3].map((q) => {
                    const v = quarter(p.doneByMonth, q)
                    return (
                      <td key={q} className={`px-3 py-3 text-right ${v ? "" : "text-ink-soft"}`}>{v ? fmt(v) : "–"}</td>
                    )
                  })}
                  <td className="px-5 py-3 text-right font-bold">{fmt(p.donePoints)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-bold">
                <th scope="row" className="px-5 py-3 text-left">ทั้งทีม</th>
                {[0, 1, 2, 3].map((q) => (
                  <td key={q} className="px-3 py-3 text-right">{fmt(quarter(summary.team.doneByMonth, q))}</td>
                ))}
                <td className="px-5 py-3 text-right">{fmt(summary.team.donePoints)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
