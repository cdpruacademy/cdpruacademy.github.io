import type PptxGenJS from "pptxgenjs"
import {
  MONTH_NAMES,
  MonthlyStore,
  ProductItem,
  TimelineType,
  checkIsProjectCompleted,
  compareMonthKeys,
  getMonthsForYear,
  getPausedItemsForMonth,
  parseMonthYear,
  parseTimelineDate,
} from "@/lib/timeline-data"
import { LaunchPlanStats, getLaunchPlanStats, getStepDurations } from "@/lib/team-metrics"

// PRU Academy brand kit (04_Copilot skill): 1920 × 1080 px slide, Cordia New everywhere
const FONT = "Cordia New"
const PAPER = "FBFAF8"
const INK = "4E565C"
const RED = "ED1B2E"
const GREY = "68737A"
const RULE = "E0E3E5"
const FOOTER =
  "Confidential: เอกสารนี้จัดทำขึ้นเพื่อใช้เป็นการภายในและประกอบการอบรมเท่านั้น ไม่อนุญาตให้ใช้ประกอบการเสนอขายผลิตภัณฑ์และ/หรือใช้สำหรับลูกค้าแต่อย่างใด"
const px = (n: number) => n / 144

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
]
const TH_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

/** "OCT 2026" → "ตุลาคม 2569" */
export function thaiMonth(month: string): string {
  const p = parseMonthYear(month)
  return p ? `${TH_MONTHS[p.monthIndex]} ${p.year + 543}` : month
}

const thaiDate = (d: Date) => `${d.getDate()} ${TH_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`

function shiftMonth(month: string, by: number): string {
  const p = parseMonthYear(month)
  if (!p) return month
  const n = p.year * 12 + p.monthIndex + by
  return `${MONTH_NAMES[n % 12]} ${Math.floor(n / 12)}`
}

const inMonth = (d: Date, month: string) => {
  const p = parseMonthYear(month)
  return !!p && d.getFullYear() === p.year && d.getMonth() === p.monthIndex
}

export interface ReportRow {
  name: string
  type: string
  channel: string
  date: string
  owner: string
}

export interface ReportImage {
  dataUrl: string
  width: number
  height: number
  title: string
}

export interface ReportData {
  month: string
  asOfText: string
  counts: {
    total: number
    completed: number
    inProgress: number
    onHold: number
    product: number
    enhancement: number
  }
  launchPlan: LaunchPlanStats
  avgDaysToLaunch: number | null
  launched: ReportRow[]
  upcoming: ReportRow[]
  onHold: ReportRow[]
  images: ReportImage[]
}

type GetItems = (month: string, type: TimelineType) => ProductItem[]

const typeLabel = (t: TimelineType) => (t === "product" ? "New Product" : "Enhancement")
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").trim()

/** The numbers and lists of one month, the same way the Timeline and Analytics count them */
export function collectReportData(
  store: MonthlyStore,
  month: string,
  getItemsForMonth: GetItems,
  asOfText: string
): Omit<ReportData, "images"> {
  const typed = (m: string) =>
    (["product", "enhancement"] as const).flatMap((type) =>
      getItemsForMonth(m, type).map((item) => ({ item, type }))
    )
  const current = typed(month)
  const items = current.map((c) => c.item)
  const completed = items.filter((i) => checkIsProjectCompleted(i, month))
  const onHold = items.filter((i) => i.isPaused && !checkIsProjectCompleted(i, month))

  const row = (item: ProductItem, type: TimelineType, date: string): ReportRow => ({
    name: oneLine(item.name),
    type: typeLabel(type),
    channel: item.broker || "–",
    date,
    owner: item.owner || "–",
  })
  const byLaunch = (a: { d: Date }, b: { d: Date }) => a.d.getTime() - b.d.getTime()

  const launched = current
    .map((c) => ({ ...c, d: parseTimelineDate(c.item.commercialDate) }))
    .filter((c): c is typeof c & { d: Date } => !!c.d && inMonth(c.d, month) && !c.item.isPaused)
    .sort(byLaunch)
    .map((c) => row(c.item, c.type, thaiDate(c.d)))

  // Next two months: projects saved in this month or the next two, launching after this month
  const next = [shiftMonth(month, 1), shiftMonth(month, 2)]
  const seen = new Set<string>()
  const upcoming = [...current, ...next.flatMap(typed)]
    .filter((c) => !seen.has(c.item.id) && !!seen.add(c.item.id))
    .map((c) => ({ ...c, d: parseTimelineDate(c.item.commercialDate) }))
    .filter(
      (c): c is typeof c & { d: Date } =>
        !!c.d && !c.item.isPaused && next.some((m) => inMonth(c.d!, m))
    )
    .sort(byLaunch)
    .map((c) => row(c.item, c.type, thaiDate(c.d)))

  const paused = [
    ...onHold.map((i) => ({ item: i, type: current.find((c) => c.item === i)!.type })),
    ...(["product", "enhancement"] as const).flatMap((type) =>
      getPausedItemsForMonth(store, month, type).map((item) => ({ item, type }))
    ),
  ].map((c) => row(c.item, c.type, c.item.pausedSince ? thaiMonth(c.item.pausedSince) : "–"))

  const months = getMonthsForYear(parseMonthYear(month)?.year ?? new Date().getFullYear()).filter(
    (m) => compareMonthKeys(m, month) <= 0
  )
  const total = getStepDurations(items, month).total

  return {
    month,
    asOfText,
    counts: {
      total: items.length,
      completed: completed.length,
      inProgress: items.length - completed.length - onHold.length,
      onHold: onHold.length,
      product: current.filter((c) => c.type === "product").length,
      enhancement: current.filter((c) => c.type === "enhancement").length,
    },
    launchPlan: getLaunchPlanStats(store, months, items, month),
    avgDaysToLaunch: total.count > 0 ? total.avgDays : null,
    launched,
    upcoming,
    onHold: paused,
  }
}

type Slide = PptxGenJS.Slide
type TextProps = PptxGenJS.TextPropsOptions

const text = (
  slide: Slide,
  value: string | PptxGenJS.TextProps[],
  x: number,
  y: number,
  w: number,
  h: number,
  opts: TextProps = {}
) =>
  slide.addText(value, {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    fontFace: FONT,
    fontSize: 20,
    color: INK,
    margin: 0,
    valign: "top",
    ...opts,
  })

/** Logo, confidential line and page number: on every slide, added first */
function frame(slide: Slide, logo: string, page: number) {
  slide.background = { color: PAPER }
  slide.addImage({ data: logo, x: px(1472), y: px(40), w: px(320), h: px(73) })
  text(slide, FOOTER, 180, 1030, 1560, 36, { fontSize: 12, color: GREY, align: "center", fit: "shrink" })
  text(slide, String(page), 1702, 1030, 90, 36, { fontSize: 12, bold: true, color: GREY, align: "right" })
}

/** Eyebrow and headline in the logo band, left of the logo */
function header(slide: Slide, eyebrow: string, title: string) {
  text(slide, eyebrow, 128, 48, 1280, 60, { fontSize: 22, bold: true, color: RED })
  text(slide, title, 128, 110, 1280, 100, { fontSize: 36, bold: true })
}

const card = (slide: Slide, x: number, y: number, w: number, h: number) =>
  slide.addShape("rect", {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    fill: { color: "FFFFFF" },
    line: { color: RULE, width: 1.5 },
  })

/** Table in the house style: grey bold header over an ink rule, hairlines, no header fill */
function table(slide: Slide, rows: ReportRow[], cols: (keyof ReportRow)[], heads: string[], widths: number[], x: number, y: number, max: number) {
  const none = { type: "none" as const }
  const hair = { type: "solid" as const, pt: 1, color: RULE }
  const cell = (value: string, head: boolean): PptxGenJS.TableCell => ({
    text: value,
    options: {
      fontFace: FONT,
      fontSize: 18,
      bold: head,
      color: head ? GREY : INK,
      valign: "middle",
      margin: [0.04, 0.08, 0.04, 0.08],
      border: [none, none, head ? { type: "solid", pt: 2.25, color: INK } : hair, none],
    },
  })
  const shown = rows.slice(0, max)
  slide.addTable(
    [heads.map((h) => cell(h, true)), ...shown.map((r) => cols.map((c) => cell(r[c], false)))],
    { x: px(x), y: px(y), colW: widths.map(px), rowH: px(52), autoPage: false }
  )
  if (rows.length > max) {
    // Fixed just above the footer, so long names that wrap cannot push it into the table
    text(slide, `และอีก ${rows.length - max} งาน`, x, 962, 600, 52, { fontSize: 18, color: GREY })
  }
}

function emptyNote(slide: Slide, value: string, x: number, y: number, w: number) {
  text(slide, value, x, y, w, 50, { fontSize: 20, color: GREY })
}

export async function buildMonthlyReport(data: ReportData, logo: string): Promise<void> {
  const { default: PptxGen } = await import("pptxgenjs")
  const pptx = new PptxGen()
  pptx.defineLayout({ name: "PRU_1920", width: px(1920), height: px(1080) })
  pptx.layout = "PRU_1920"
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT }
  pptx.title = `CD Team · ${thaiMonth(data.month)}`

  const th = thaiMonth(data.month)
  const { counts } = data
  let page = 0
  const next = () => {
    const slide = pptx.addSlide()
    frame(slide, logo, ++page)
    slide.addNotes(`ข้อมูลจาก CD Team Dashboard ${data.asOfText}`)
    return slide
  }

  // 1. Cover: red panel left, the month's result on paper right
  {
    const s = next()
    s.addShape("rect", { x: 0, y: 0, w: px(1180), h: px(980), fill: { color: RED }, line: { color: RED, width: 0 } })
    text(s, "CD Team · PRU Academy", 128, 260, 960, 70, { fontSize: 26, bold: true, color: "FFFFFF" })
    text(s, "รายงานประจำเดือน", 128, 340, 960, 160, { fontSize: 60, bold: true, color: "FFFFFF" })
    text(s, th, 128, 510, 960, 115, { fontSize: 40, color: "FFFFFF" })
    text(s, data.asOfText, 128, 640, 960, 65, { fontSize: 22, color: "FFFFFF" })
    text(s, String(counts.completed), 1260, 330, 532, 260, { fontSize: 100, bold: true, color: RED })
    text(s, `จาก ${counts.total} โปรเจกต์ เสร็จแล้ว`, 1260, 600, 532, 70, { fontSize: 24 })
  }

  // 2. Key numbers
  {
    const s = next()
    header(s, `ภาพรวม · ${th}`, "ตัวเลขสำคัญของเดือน")
    const tiles: [string, number, string][] = [
      ["โปรเจกต์ทั้งหมด", counts.total, INK],
      ["เสร็จแล้ว", counts.completed, INK],
      ["กำลังทำ", counts.inProgress, RED],
      ["On hold", counts.onHold, GREY],
    ]
    tiles.forEach(([label, value, color], i) => {
      const x = 128 + i * (392 + 32)
      card(s, x, 250, 392, 290)
      text(s, label, x + 32, 275, 328, 62, { fontSize: 22, color: GREY })
      text(s, String(value), x + 32, 335, 328, 190, { fontSize: 72, bold: true, color })
    })

    const lp = data.launchPlan
    const wide: [string, string, string][] = [
      [
        "Launch ตรงแผน",
        lp.tracked > 0 ? `${lp.onPlan}/${lp.tracked}` : "–",
        lp.tracked > 0
          ? lp.slipped > 0 ? `เลื่อน ${lp.slipped} งาน เฉลี่ย +${lp.avgSlipDays} วัน` : "ตรงแผนทุกงาน"
          : "ยังไม่มีแผนเดิมให้เทียบ",
      ],
      [
        "Kick-off ถึง Launch เฉลี่ย",
        data.avgDaysToLaunch !== null ? `${data.avgDaysToLaunch} วัน` : "–",
        "จากงานที่เสร็จในเดือนนี้",
      ],
      ["New Product · Enhancement", `${counts.product} · ${counts.enhancement}`, "จำนวนโปรเจกต์ตามประเภท"],
    ]
    wide.forEach(([label, value, sub], i) => {
      const x = 128 + i * (533 + 32)
      card(s, x, 580, 533, 360)
      text(s, label, x + 32, 605, 469, 62, { fontSize: 22, color: GREY })
      text(s, value, x + 32, 665, 469, 190, { fontSize: 72, bold: true })
      text(s, sub, x + 32, 862, 469, 52, { fontSize: 18, color: GREY })
    })
  }

  // 3. Launched this month
  {
    const s = next()
    header(s, `Launch · ${th}`, `งานที่ launch เดือนนี้ ${data.launched.length} งาน`)
    if (data.launched.length === 0) emptyNote(s, "ไม่มีงาน launch ในเดือนนี้", 128, 260, 1664)
    else
      table(s, data.launched, ["name", "type", "channel", "date", "owner"],
        ["โปรเจกต์", "ประเภท", "ช่องทาง", "วัน Launch", "ผู้รับผิดชอบ"],
        [700, 230, 250, 220, 264], 128, 240, 10)
  }

  // 4. Next two months and On hold
  {
    const s = next()
    header(s, `ถัดไป · ${thaiMonth(shiftMonth(data.month, 1))} – ${thaiMonth(shiftMonth(data.month, 2))}`, "งานที่จะ launch และงานที่พักไว้")
    text(s, `Launch ใน 2 เดือนข้างหน้า (${data.upcoming.length})`, 128, 240, 1000, 50, { fontSize: 24, bold: true })
    if (data.upcoming.length === 0) emptyNote(s, "ยังไม่มีงานที่กำหนดวัน launch", 128, 310, 1000)
    else table(s, data.upcoming, ["name", "channel", "date"], ["โปรเจกต์", "ช่องทาง", "วัน Launch"], [560, 220, 220], 128, 300, 10)

    text(s, `On hold ทั้งหมด (${data.onHold.length})`, 1192, 240, 600, 50, { fontSize: 24, bold: true })
    if (data.onHold.length === 0) emptyNote(s, "ไม่มีงานที่พักไว้", 1192, 310, 600)
    else table(s, data.onHold, ["name", "date"], ["โปรเจกต์", "พักตั้งแต่"], [400, 200], 1192, 300, 10)
  }

  // 5+. The same images the LINE bot sends, fitted into the content area
  data.images.forEach((img) => {
    const s = next()
    header(s, th, img.title)
    const box = { x: 128, y: 220, w: 1664, h: 780 }
    const scale = Math.min(box.w / img.width, box.h / img.height)
    const w = img.width * scale
    const h = img.height * scale
    s.addImage({ data: img.dataUrl, x: px(box.x + (box.w - w) / 2), y: px(box.y), w: px(w), h: px(h) })
  })

  await pptx.writeFile({ fileName: `CD-Team-Report_${data.month.replace(/\s+/g, "-")}.pptx` })
}
