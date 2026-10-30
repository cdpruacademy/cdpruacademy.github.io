import {
  MONTH_NAMES,
  MonthlyStore,
  ProductItem,
  TimelineType,
  checkIsProjectCompleted,
  compareMonthKeys,
  findLatestCopy,
  parseMonthYear,
  parseTimelineDate,
  sortMonthsChronologically,
} from "./timeline-data"
import { getSupabaseClient, isCurrentUserAdmin } from "./supabase"

/**
 * How hard a New Product is. Enhancements are always "low".
 * high: Unit link, Health, Index link · medium: Whole life, Saving
 */
export type Level = "high" | "medium" | "low"

export const LEVEL_LABEL: Record<Level, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}
export const LEVEL_HINT: Record<Level, string> = {
  high: "Unit link · Health · Index link",
  medium: "Whole life · Saving",
  low: "Enhancement",
}

/** Points for each factor; the owner tunes these on /kpi */
export interface DifficultyWeights {
  high: number
  medium: number
  low: number
  elearning: number
  newContent: number
  refresher: number
  /** Audit-type work: once for the coordination, then per old file revised */
  audit: number
  perFile: number
}

/** What the owner sets by hand for one project (keyed by project id) */
export interface ProjectFactors {
  level?: Level
  /** Overrides the e-Learning read from the steps and the ttb rule */
  elearning?: boolean
  newContent?: boolean
  /** Old files revised (Audit-type work); 0 or missing means none */
  files?: number
  /** Manual nudge, -1 to +1 */
  adjust?: number
  /** Percent per owner name; missing means an equal split */
  shares?: Record<string, number>
}

/** A ttb Refresher lesson (quarterly e-Learning review); kept here only, not on the Timeline */
export interface Refresher {
  id: string
  year: number
  quarter: 1 | 2 | 3 | 4
  title: string
  owner: string
  shares?: Record<string, number>
  done: boolean
}

export interface DifficultyStore {
  weights: DifficultyWeights
  projects: Record<string, ProjectFactors>
  refreshers: Refresher[]
}

export const DEFAULT_WEIGHTS: DifficultyWeights = {
  high: 5,
  medium: 3,
  low: 1,
  elearning: 2,
  newContent: 2,
  refresher: 2,
  audit: 2,
  perFile: 1,
}

export const EMPTY_DIFFICULTY: DifficultyStore = { weights: DEFAULT_WEIGHTS, projects: {}, refreshers: [] }

const ROW_ID = "difficulty_scores"

/** First guess from the plan name; the owner corrects it on /kpi */
export function guessLevel(item: ProductItem, type: TimelineType): Level {
  if (type === "enhancement") return "low"
  return /link|index|health|cancer|\bci\b|care\b|princip(al|le) protect|multi-asset/i.test(item.name)
    ? "high"
    : "medium"
}

export function levelOf(item: ProductItem, type: TimelineType, f?: ProjectFactors): Level {
  if (type === "enhancement") return "low"
  return f?.level ?? guessLevel(item, type)
}

/** ttb (not ttb touch) always comes with an e-Learning lesson */
export const isTtbChannel = (broker?: string) => (broker || "").trim().toLowerCase() === "ttb"

export function hasElearning(item: ProductItem, f?: ProjectFactors): boolean {
  if (f?.elearning !== undefined) return f.elearning
  return (
    isTtbChannel(item.broker) ||
    Boolean(item.milestones?.["first-draft-elearning"] || item.milestones?.["final-elearning"])
  )
}

/** People named in `owner`, e.g. "Nitikan B. / Surakit P." */
export function ownersOf(owner?: string): string[] {
  const names = (owner || "")
    .split(/\s*(?:\/|,|&)\s*/)
    .map((s) => s.trim())
    .filter((s) => s && s.toUpperCase() !== "TBC")
  return names.length ? names : ["—"]
}

/** Each owner's share of the points (0–1), from the set percents or an equal split */
export function sharesOf(owner: string | undefined, shares?: Record<string, number>): Record<string, number> {
  const names = ownersOf(owner)
  const set = names.map((n) => Math.max(0, shares?.[n] ?? 0))
  const total = set.reduce((s, v) => s + v, 0)
  return Object.fromEntries(names.map((n, i) => [n, total > 0 ? set[i] / total : 1 / names.length]))
}

export interface ScoreBreakdown {
  level: Level
  levelPoints: number
  elearning: number
  newContent: number
  audit: number
  adjust: number
  total: number
}

export function scoreProject(
  item: ProductItem,
  type: TimelineType,
  f: ProjectFactors | undefined,
  w: DifficultyWeights
): ScoreBreakdown {
  const level = levelOf(item, type, f)
  const parts = {
    levelPoints: w[level],
    elearning: hasElearning(item, f) ? w.elearning : 0,
    newContent: f?.newContent ? w.newContent : 0,
    audit: f?.files && f.files > 0 ? w.audit + f.files * w.perFile : 0,
    adjust: Math.max(-1, Math.min(1, f?.adjust ?? 0)),
  }
  const total = Math.max(0, parts.levelPoints + parts.elearning + parts.newContent + parts.audit + parts.adjust)
  return { level, ...parts, total }
}

export interface KpiProject {
  id: string
  type: TimelineType
  item: ProductItem
  completed: boolean
  /** Month key ("OCT 2026") the project finished in */
  completedMonth?: string
  /** Months with a saved copy, oldest first */
  months: string[]
}

const toMonthKey = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`

/**
 * One entry per project id, from its latest saved copy. The id stays the same when a
 * carried-over project is edited in a later month, so it identifies a project across months.
 */
export function collectProjects(store: MonthlyStore, asOfMonth: string): KpiProject[] {
  const seen = new Map<string, { type: TimelineType; months: string[] }>()
  for (const month of sortMonthsChronologically(Object.keys(store))) {
    const m = store[month]
    const add = (list: ProductItem[] | undefined, type: TimelineType) =>
      (list || []).forEach((p) => {
        if (p.isDeleted) return
        const entry = seen.get(p.id) || { type, months: [] }
        entry.months.push(month)
        seen.set(p.id, entry)
      })
    add(m?.products, "product")
    add(m?.enhancements, "enhancement")
  }

  const result: KpiProject[] = []
  seen.forEach(({ type, months }, id) => {
    const item = findLatestCopy(store, id, asOfMonth)
    if (!item) return
    const completed = checkIsProjectCompleted(item, asOfMonth)
    result.push({
      id,
      type,
      item,
      completed,
      completedMonth: completed ? completionMonth(item, months, asOfMonth) : undefined,
      months,
    })
  })
  return result
}

/** Month the project finished: the finishing step's date, else the launch date, else its last saved month */
function completionMonth(item: ProductItem, months: string[], asOfMonth: string): string {
  const m = item.milestones || {}
  const candidates = [
    m["internal-training"]?.status === "completed" ? m["internal-training"]?.date : undefined,
    m.launch?.status === "completed" ? m.launch?.date : undefined,
    item.commercialDate,
    item.internalDate,
  ]
  for (const c of candidates) {
    const d = parseTimelineDate(c)
    if (d) {
      const key = toMonthKey(d)
      // A date after the month we look from is a plan, not a finish
      if (compareMonthKeys(key, asOfMonth) <= 0) return key
    }
  }
  const last = months[months.length - 1]
  return last && parseMonthYear(last) ? last : asOfMonth
}

/** A Refresher counts in the last month of its quarter */
export const refresherMonthIndex = (r: Refresher) => r.quarter * 3 - 1

/** Reads the owner's scores (admin only; the row is not public) */
export async function fetchDifficulty(): Promise<DifficultyStore | null> {
  const client = getSupabaseClient()
  if (!client) return null
  const { data, error } = await client.from("timeline_store").select("data").eq("id", ROW_ID).maybeSingle()
  if (error) {
    console.warn("fetchDifficulty error:", error.message)
    return null
  }
  const raw = data?.data as Partial<DifficultyStore> | undefined
  return {
    weights: { ...DEFAULT_WEIGHTS, ...(raw?.weights || {}) },
    projects: raw?.projects && typeof raw.projects === "object" ? raw.projects : {},
    refreshers: Array.isArray(raw?.refreshers) ? raw.refreshers : [],
  }
}

export async function saveDifficulty(next: DifficultyStore): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" }
  if (!(await isCurrentUserAdmin())) return { success: false, error: "ต้องเข้าสู่ระบบ Admin" }
  const now = new Date().toISOString()
  const { error } = await client.from("timeline_store").upsert(
    { id: ROW_ID, data: { ...next, updated_at: now }, updated_at: now, updated_by: "pru_admin" },
    { onConflict: "id" }
  )
  return error ? { success: false, error: error.message } : { success: true }
}
