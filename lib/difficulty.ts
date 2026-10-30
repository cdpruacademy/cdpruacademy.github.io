import {
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

/** Points for each factor; the owner tunes these on /kpi */
export interface DifficultyWeights {
  product: number
  enhancement: number
  /** Added for each channel after the first */
  perExtraChannel: number
  elearning: number
  newContent: number
}

/** What the owner sets by hand for one project (keyed by project id) */
export interface ProjectFactors {
  /** Content written from scratch rather than adapted */
  newContent?: boolean
  /** Overrides the channel count read from `broker` */
  channels?: number
  /** Manual nudge, -1 to +1 */
  adjust?: number
}

export interface DifficultyStore {
  weights: DifficultyWeights
  projects: Record<string, ProjectFactors>
}

export const DEFAULT_WEIGHTS: DifficultyWeights = {
  product: 3,
  enhancement: 1,
  perExtraChannel: 1,
  elearning: 2,
  newContent: 2,
}

export const EMPTY_DIFFICULTY: DifficultyStore = { weights: DEFAULT_WEIGHTS, projects: {} }

const ROW_ID = "difficulty_scores"

/** Channels named in `broker`, e.g. "ttb / ttb touch" is 2 */
export function channelCount(broker?: string): number {
  const parts = (broker || "").split(/\s*(?:\/|,|&|\+)\s*/).filter((s) => s.trim())
  return Math.max(1, parts.length)
}

export function hasElearning(item: ProductItem): boolean {
  return Boolean(item.milestones?.["first-draft-elearning"] || item.milestones?.["final-elearning"])
}

/** People named in `owner`, e.g. "Nitikan B. / Surakit P." */
export function ownersOf(owner?: string): string[] {
  const names = (owner || "").split(/\s*(?:\/|,|&)\s*/).map((s) => s.trim()).filter(Boolean)
  return names.length ? names : ["—"]
}

export interface ScoreBreakdown {
  type: number
  channels: number
  elearning: number
  newContent: number
  adjust: number
  total: number
  channelCount: number
}

export function scoreProject(
  item: ProductItem,
  type: TimelineType,
  factors: ProjectFactors | undefined,
  w: DifficultyWeights
): ScoreBreakdown {
  const count = factors?.channels ?? channelCount(item.broker)
  const parts = {
    type: type === "product" ? w.product : w.enhancement,
    channels: Math.max(0, count - 1) * w.perExtraChannel,
    elearning: hasElearning(item) ? w.elearning : 0,
    newContent: factors?.newContent ? w.newContent : 0,
    adjust: Math.max(-1, Math.min(1, factors?.adjust ?? 0)),
  }
  const total = Math.max(0, parts.type + parts.channels + parts.elearning + parts.newContent + parts.adjust)
  return { ...parts, total, channelCount: count }
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

const toMonthKey = (d: Date) =>
  `${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()]} ${d.getFullYear()}`

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
