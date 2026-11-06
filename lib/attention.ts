import { getProgress } from "@/components/dashboard/timeline-row"
import { ProductItem, TimelineType, parseTimelineDate } from "./timeline-data"

export type AttentionFor = (item: ProductItem) => string | null

const DAY_MS = 24 * 60 * 60 * 1000
const LAUNCH_SOON_DAYS = 30

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS)

/**
 * Why a project needs a look, or null. The team dates a step when it is done, so only a step
 * still open counts as a plan: its date has passed, or it is near and the launch has no date.
 * Finished and on-hold projects never need one.
 */
export function getAttention(item: ProductItem, timelineType: TimelineType, today: Date): string | null {
  const { phases, current, isFinished } = getProgress(item, timelineType)
  if (isFinished || item.isPaused) return null
  const day = startOfDay(today)

  if (current >= 0) {
    const step = item.milestones[phases[current].key]
    const planned = parseTimelineDate(step?.date)
    if (step?.status !== "completed" && planned && planned < day) {
      return `เกินแผน ${daysBetween(planned, day)} วัน`
    }
  }

  if (parseTimelineDate(item.commercialDate) || item.customRightLabel) return null
  const stepIsNear = phases.some((phase) => {
    const step = item.milestones[phase.key]
    const planned = parseTimelineDate(step?.date)
    if (step?.status === "completed" || !planned) return false
    const daysAway = daysBetween(day, planned)
    return daysAway >= 0 && daysAway <= LAUNCH_SOON_DAYS
  })
  return stepIsNear ? "ยังไม่มีวันเปิดตัว" : null
}
