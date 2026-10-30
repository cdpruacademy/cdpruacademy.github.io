import { MONTH_NAMES, parseMonthYear } from "./timeline-data"
import {
  DifficultyWeights,
  KpiProject,
  LEVEL_LABEL,
  ProjectFactors,
  Refresher,
  ScoreBreakdown,
  refresherMonthIndex,
  sharesOf,
} from "./difficulty"

export interface ScoredProject extends KpiProject {
  factors: ProjectFactors
  score: ScoreBreakdown
  /** On this month's Timeline and not finished */
  isActiveNow: boolean
}

/** One piece of work in a person's list: a project or a Refresher */
export interface WorkRow {
  kind: "New Product" | "Enhancement" | "Refresher"
  name: string
  channel: string
  level: string
  elearning: boolean
  done: boolean
  /** "OCT 2026", or "Q3 2026" for a Refresher */
  when: string
  monthIndex: number | null
  points: number
  share: number
  myPoints: number
}

export interface PersonSummary {
  name: string
  doneByMonth: number[]
  donePoints: number
  doneCount: number
  loadPoints: number
  loadCount: number
  rows: WorkRow[]
}

/**
 * Points per person for a year: finished work counts in the month it finished,
 * open work counts as current load. Shared work splits by the set percents.
 */
export function summarize(
  projects: ScoredProject[],
  refreshers: Refresher[],
  weights: DifficultyWeights,
  year: number
): { people: PersonSummary[]; team: Omit<PersonSummary, "name" | "rows"> } {
  const people = new Map<string, PersonSummary>()
  const person = (name: string) => {
    let p = people.get(name)
    if (!p) {
      p = { name, doneByMonth: Array(12).fill(0), donePoints: 0, doneCount: 0, loadPoints: 0, loadCount: 0, rows: [] }
      people.set(name, p)
    }
    return p
  }

  const add = (base: Omit<WorkRow, "share" | "myPoints">, owner: string | undefined, shares?: Record<string, number>) => {
    Object.entries(sharesOf(owner, shares)).forEach(([name, share]) => {
      const p = person(name)
      const myPoints = base.points * share
      p.rows.push({ ...base, share, myPoints })
      if (base.done && base.monthIndex !== null) {
        p.doneByMonth[base.monthIndex] += myPoints
        p.donePoints += myPoints
        p.doneCount += 1
      } else if (!base.done) {
        p.loadPoints += myPoints
        p.loadCount += 1
      }
    })
  }

  projects.forEach((p) => {
    const done = p.completedMonth ? parseMonthYear(p.completedMonth) : null
    const doneThisYear = Boolean(done && done.year === year)
    if (!doneThisYear && !p.isActiveNow) return
    add(
      {
        kind: p.type === "product" ? "New Product" : "Enhancement",
        name: p.item.name.replace(/\s*\n\s*/g, " "),
        channel: p.item.broker || "–",
        level: LEVEL_LABEL[p.score.level],
        elearning: p.score.elearning > 0,
        done: doneThisYear,
        when: doneThisYear ? p.completedMonth! : "In progress",
        monthIndex: doneThisYear ? done!.monthIndex : null,
        points: p.score.total,
      },
      p.item.owner,
      p.factors.shares
    )
  })

  refreshers
    .filter((r) => r.year === year)
    .forEach((r) =>
      add(
        {
          kind: "Refresher",
          name: r.title || `Refresher Q${r.quarter}`,
          channel: "ttb",
          level: "–",
          elearning: true,
          done: r.done,
          when: `Q${r.quarter} ${r.year}`,
          monthIndex: r.done ? refresherMonthIndex(r) : null,
          points: weights.refresher,
        },
        r.owner,
        r.shares
      )
    )

  const list = Array.from(people.values())
    .filter((p) => p.name !== "—")
    .sort((a, b) => b.donePoints - a.donePoints || a.name.localeCompare(b.name))
  list.forEach((p) => p.rows.sort((a, b) => Number(a.done) - Number(b.done) || (b.monthIndex ?? 0) - (a.monthIndex ?? 0)))

  const team = {
    doneByMonth: MONTH_NAMES.map((_, i) => list.reduce((s, p) => s + p.doneByMonth[i], 0)),
    donePoints: list.reduce((s, p) => s + p.donePoints, 0),
    doneCount: list.reduce((s, p) => s + p.doneCount, 0),
    loadPoints: list.reduce((s, p) => s + p.loadPoints, 0),
    loadCount: list.reduce((s, p) => s + p.loadCount, 0),
  }
  return { people: list, team }
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
