import {
  MonthlyStore,
  PhaseKey,
  ProductItem,
  TimelineType,
  checkIsProjectCompleted,
  compareMonthKeys,
  getMonthsForYear,
  getSystemCurrentMonth,
  parseTimelineDate,
} from "@/lib/timeline-data"

const DAY_MS = 86_400_000
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / DAY_MS)

export interface LaunchPlanStats {
  tracked: number
  onPlan: number
  slipped: number
  avgSlipDays: number
}

/**
 * Launch on plan: the first launch date saved for a finished project against the last one.
 * Only projects saved in two months or more count, since one month has no earlier plan.
 */
export function getLaunchPlanStats(
  store: MonthlyStore,
  months: string[],
  items: ProductItem[],
  referenceMonth?: string
): LaunchPlanStats {
  const ids = new Set(
    items.filter((i) => checkIsProjectCompleted(i, referenceMonth)).map((i) => i.id)
  )
  const plans = new Map<string, { month: string; date: Date }[]>()
  months.forEach((month) => {
    const data = store[month]
    if (!data) return
    ;[...(data.products || []), ...(data.enhancements || [])].forEach((p) => {
      if (p.isDeleted || !ids.has(p.id)) return
      const date = parseTimelineDate(p.commercialDate)
      if (!date) return
      plans.set(p.id, [...(plans.get(p.id) || []), { month, date }])
    })
  })

  let tracked = 0
  let onPlan = 0
  let slipDays = 0
  plans.forEach((list) => {
    if (list.length < 2) return
    list.sort((a, b) => compareMonthKeys(a.month, b.month))
    tracked += 1
    const slip = daysBetween(list[0].date, list[list.length - 1].date)
    if (slip <= 0) onPlan += 1
    else slipDays += slip
  })
  const slipped = tracked - onPlan
  return {
    tracked,
    onPlan,
    slipped,
    avgSlipDays: slipped ? Math.round(slipDays / slipped) : 0,
  }
}

export interface StepDuration {
  label: string
  avgDays: number
  count: number
}

const STEPS: { from: PhaseKey; to: PhaseKey; label: string }[] = [
  { from: "kick-off", to: "first-draft", label: "Kick-off → First Draft" },
  { from: "first-draft", to: "final-approval", label: "First Draft → Final Approval" },
  { from: "final-approval", to: "internal-training", label: "Final Approval → Internal Training" },
  { from: "internal-training", to: "launch", label: "Internal Training → Launch" },
]

/** Date a step was done; Launch falls back to Target Launch once the project is finished */
function doneDate(item: ProductItem, key: PhaseKey, finished: boolean): Date | null {
  const m = item.milestones?.[key]
  if (m?.status === "completed" && m.date) return parseTimelineDate(m.date)
  if (key === "launch" && finished) return parseTimelineDate(item.commercialDate)
  return null
}

/** Average days between finished steps; gaps that run backwards are typing slips and skipped */
export function getStepDurations(
  items: ProductItem[],
  referenceMonth?: string
): { steps: StepDuration[]; total: StepDuration } {
  const sums = STEPS.map(() => ({ days: 0, count: 0 }))
  const total = { days: 0, count: 0 }

  items.forEach((item) => {
    const finished = checkIsProjectCompleted(item, referenceMonth)
    STEPS.forEach((step, idx) => {
      const a = doneDate(item, step.from, finished)
      const b = doneDate(item, step.to, finished)
      if (!a || !b) return
      const d = daysBetween(a, b)
      if (d < 0) return
      sums[idx].days += d
      sums[idx].count += 1
    })
    const start = doneDate(item, "kick-off", finished)
    const end = doneDate(item, "launch", finished)
    if (start && end && end >= start) {
      total.days += daysBetween(start, end)
      total.count += 1
    }
  })

  const avg = (s: { days: number; count: number }) =>
    s.count ? Math.round(s.days / s.count) : 0
  return {
    steps: STEPS.map((step, idx) => ({
      label: step.label,
      avgDays: avg(sums[idx]),
      count: sums[idx].count,
    })),
    total: { label: "Kick-off → Launch", avgDays: avg(total), count: total.count },
  }
}

export interface YearProject {
  item: ProductItem
  type: TimelineType
  completed: boolean
}

/** Every project of a year, by id, as its latest saved copy, with whether it finished */
export function getYearProjects(store: MonthlyStore, year: number): YearProject[] {
  const months = getMonthsForYear(year)
  const latest = new Map<string, { item: ProductItem; type: TimelineType }>()
  months.forEach((month) => {
    const data = store[month]
    if (!data) return
    ;(data.products || []).forEach(
      (p) => !p.isDeleted && latest.set(p.id, { item: p, type: "product" })
    )
    ;(data.enhancements || []).forEach(
      (e) => !e.isDeleted && latest.set(e.id, { item: e, type: "enhancement" })
    )
  })
  // Status as of December, or this month for the current year
  const lastMonth = months[months.length - 1]
  const thisMonth = getSystemCurrentMonth()
  const statusMonth = compareMonthKeys(thisMonth, lastMonth) < 0 ? thisMonth : lastMonth
  return Array.from(latest.values()).map(({ item, type }) => ({
    item,
    type,
    completed: checkIsProjectCompleted(item, statusMonth),
  }))
}
