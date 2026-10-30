"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useProducts } from "@/hooks/use-products"
import { AdminLoginModal } from "@/components/auth/admin-login-modal"
import { Icon } from "@/components/icon"
import { PickMenu } from "@/components/ui/pick-menu"
import { PageBody, PageHero, card, cardButtonDark, heroButtonSolid } from "@/components/page-hero"
import { ProjectScoreList, ScoredProject, fmt } from "@/components/kpi/project-score-list"
import { WeightsCard } from "@/components/kpi/weights-card"
import {
  DifficultyStore,
  EMPTY_DIFFICULTY,
  ProjectFactors,
  collectProjects,
  fetchDifficulty,
  ownersOf,
  saveDifficulty,
  scoreProject,
} from "@/lib/difficulty"
import {
  MONTH_NAMES,
  checkIsProjectCompleted,
  getAvailableYears,
  getSystemCurrentMonth,
  parseMonthYear,
} from "@/lib/timeline-data"
import { toast } from "@/lib/notify"

type Filter = "active" | "done" | "all"

/** Hidden owner page: difficulty points per project and KPI per person */
export function KpiView() {
  const { isAdmin, isAuthLoaded, login } = useAdminAuth()
  const { monthlyStore, getItemsForMonth, isLoaded } = useProducts()
  const [saved, setSaved] = useState<DifficultyStore | null>(null)
  const [draft, setDraft] = useState<DifficultyStore | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const nowMonth = getSystemCurrentMonth()
  const [year, setYear] = useState(() => parseMonthYear(nowMonth)?.year ?? new Date().getFullYear())
  const [filter, setFilter] = useState<Filter>("active")

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

  // Points per person: a shared project splits its points equally
  const { owners, byMonth, yearTotal, load, loadCount, doneCount } = useMemo(() => {
    const byMonth: Record<string, number[]> = {}
    const load: Record<string, number> = {}
    const loadCount: Record<string, number> = {}
    const doneCount: Record<string, number> = {}
    const ensure = (o: string) => {
      byMonth[o] ||= Array(12).fill(0)
      load[o] ||= 0
      loadCount[o] ||= 0
      doneCount[o] ||= 0
    }
    let yearTotal = 0
    projects.forEach((p) => {
      const names = ownersOf(p.item.owner)
      const share = p.score.total / names.length
      const done = p.completedMonth ? parseMonthYear(p.completedMonth) : null
      names.forEach((o) => {
        ensure(o)
        if (done && done.year === year) {
          byMonth[o][done.monthIndex] += share
          doneCount[o] += 1
        }
        if (p.isActiveNow) {
          load[o] += share
          loadCount[o] += 1
        }
      })
      if (done && done.year === year) yearTotal += p.score.total
    })
    const owners = Object.keys(byMonth)
      .filter((o) => byMonth[o].some((v) => v > 0) || load[o] > 0)
      .sort((a, b) => sum(byMonth[b]) - sum(byMonth[a]) || a.localeCompare(b))
    return { owners, byMonth, yearTotal, load, loadCount, doneCount }
  }, [projects, year])

  const listed = useMemo(() => {
    const rows = projects.filter((p) => {
      if (filter === "active") return p.isActiveNow
      if (filter === "done") return p.completedMonth && parseMonthYear(p.completedMonth)?.year === year
      return true
    })
    return rows.sort((a, b) => b.score.total - a.score.total || a.item.name.localeCompare(b.item.name))
  }, [projects, filter, year])

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

  const totalLoad = projects.filter((p) => p.isActiveNow).reduce((s, p) => s + p.score.total, 0)
  const yearOptions = getAvailableYears(monthlyStore).map((y) => ({ value: String(y), label: String(y) }))

  return (
    <div>
      <PageHero>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">KPI</h1>
            <PickMenu
              label="Year"
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={yearOptions}
              className="h-10 w-fit rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
            />
          </div>
          <div className="flex flex-wrap items-end gap-7">
            <div>
              <div className="text-sm">Completed {year}</div>
              <div className="text-[44px] leading-none font-bold tabular-nums">{fmt(yearTotal)}</div>
              <div className="text-xs opacity-85">pts</div>
            </div>
            <div>
              <div className="text-sm">In progress</div>
              <div className="text-[44px] leading-none font-bold tabular-nums">{fmt(totalLoad)}</div>
              <div className="text-xs opacity-85">pts</div>
            </div>
            <button type="button" onClick={save} disabled={!isDirty || isSaving} className={heroButtonSolid}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={18} strokeWidth={2.4} />}
              {isDirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      </PageHero>

      <PageBody className="flex flex-col gap-5">
        {!isLoaded || saved === null ? (
          <div className={`${card} flex justify-center py-10`}>
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : (
          <>
            <section className={`${card} overflow-hidden`}>
              <h2 className="px-5 pt-5 pb-3 text-lg font-bold">Points by owner · {year}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm tabular-nums">
                  <thead>
                    <tr className="border-y border-rule bg-shade text-xs font-semibold text-ink-soft">
                      <th scope="col" className="px-5 py-2 text-left">Owner</th>
                      {MONTH_NAMES.map((m) => (
                        <th key={m} scope="col" className="px-1 py-2 text-right">{m.slice(0, 1) + m.slice(1).toLowerCase()}</th>
                      ))}
                      <th scope="col" className="px-3 py-2 text-right text-done">Completed</th>
                      <th scope="col" className="px-5 py-2 text-right text-brand-ink">In progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {owners.length === 0 && (
                      <tr>
                        <td colSpan={15} className="px-5 py-6 text-ink-soft">ไม่มีข้อมูล</td>
                      </tr>
                    )}
                    {owners.map((o) => (
                      <tr key={o}>
                        <th scope="row" className="px-5 py-3 text-left font-semibold whitespace-nowrap">{o}</th>
                        {byMonth[o].map((v, i) => (
                          <td key={i} className={`px-1 py-3 text-right ${v ? "" : "text-rule"}`}>{v ? fmt(v) : "·"}</td>
                        ))}
                        <td className="px-3 py-3 text-right">
                          <b className="text-base text-done">{fmt(sum(byMonth[o]))}</b>
                          <span className="block text-[11px] text-ink-soft">{doneCount[o]} งาน</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <b className="text-base text-brand-ink">{fmt(load[o])}</b>
                          <span className="block text-[11px] text-ink-soft">{loadCount[o]} งาน</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-[13px] text-ink-soft">งานที่มีหลาย Owner แบ่งคะแนนเท่ากัน</p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <ProjectScoreList
                projects={listed}
                onChange={setFactors}
                toolbar={
                  <PickMenu
                    label="Show"
                    value={filter}
                    onChange={(v) => setFilter(v as Filter)}
                    align="end"
                    options={[
                      { value: "active", label: "In progress" },
                      { value: "done", label: `Completed ${year}` },
                      { value: "all", label: "All projects" },
                    ]}
                    className="h-9 rounded-full border border-rule bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
                  />
                }
              />
              <WeightsCard weights={data.weights} onChange={(weights) => setDraft({ ...data, weights })} />
            </div>
          </>
        )}
      </PageBody>
    </div>
  )
}

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0)
