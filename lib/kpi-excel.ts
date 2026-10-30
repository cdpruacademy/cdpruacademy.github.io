import { MONTH_NAMES } from "./timeline-data"
import { DifficultyWeights, LEVEL_HINT, LEVEL_LABEL } from "./difficulty"
import { PersonSummary, summarize } from "./kpi-summary"

const RED = "FFED1B2E"
const INK = "FF4E565C"
const RULE = "FFE0E3E5"

/** Sheet names: at most 31 characters and none of : \ / ? * [ ] */
const sheetName = (name: string, used: Set<string>) => {
  const base = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 28) || "Person"
  let n = base
  for (let i = 2; used.has(n); i++) n = `${base} ${i}`
  used.add(n)
  return n
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** KPI workbook: a team sheet, one sheet per person, and the scoring rules */
export async function downloadKpiExcel(
  summary: ReturnType<typeof summarize>,
  weights: DifficultyWeights,
  year: number
): Promise<void> {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "CD Team Dashboard"
  const used = new Set<string>()

  type Sheet = ReturnType<typeof wb.addWorksheet>
  const title = (ws: Sheet, text: string, cols: number) => {
    ws.addRow([text]).font = { bold: true, size: 16, color: { argb: RED } }
    ws.mergeCells(1, 1, 1, cols)
    ws.addRow([])
  }
  const header = (ws: Sheet, values: string[]) => {
    const row = ws.addRow(values)
    row.font = { bold: true, color: { argb: INK } }
    row.eachCell((c) => {
      c.border = { bottom: { style: "medium", color: { argb: INK } } }
      c.alignment = { vertical: "middle", wrapText: true }
    })
    return row
  }
  const hair = (row: { eachCell: (fn: (c: { border: object }) => void) => void }) =>
    row.eachCell((c) => {
      c.border = { bottom: { style: "thin", color: { argb: RULE } } }
    })

  // Team
  const months = MONTH_NAMES.map((m) => m[0] + m.slice(1).toLowerCase())
  const team = wb.addWorksheet(sheetName("สรุปทีม", used))
  title(team, `KPI ทีม CD · ${year}`, 17)
  header(team, ["คน", ...months, "คะแนนงานเสร็จ", "งานเสร็จ", "คะแนนงานที่กำลังทำ", "งานที่กำลังทำ"])
  summary.people.forEach((p) =>
    hair(
      team.addRow([
        p.name,
        ...p.doneByMonth.map((v) => (v ? round1(v) : null)),
        round1(p.donePoints),
        p.doneCount,
        round1(p.loadPoints),
        p.loadCount,
      ])
    )
  )
  const total = team.addRow([
    "รวมทั้งทีม",
    ...summary.team.doneByMonth.map((v) => (v ? round1(v) : null)),
    round1(summary.team.donePoints),
    null,
    round1(summary.team.loadPoints),
    null,
  ])
  total.font = { bold: true }
  team.getColumn(1).width = 22
  for (let c = 2; c <= 13; c++) team.getColumn(c).width = 7
  ;[14, 15, 16, 17].forEach((c) => (team.getColumn(c).width = 14))
  team.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }]

  // One sheet per person
  summary.people.forEach((p: PersonSummary) => {
    const ws = wb.addWorksheet(sheetName(p.name, used))
    title(ws, `${p.name} · ${year}`, 10)
    header(ws, ["ประเภท", "งาน", "ช่องทาง", "หมวด", "e-Learning", "สถานะ", "เดือน / ไตรมาส", "คะแนนเต็ม", "สัดส่วน", "คะแนนที่ได้"])
    p.rows.forEach((r) => {
      const row = ws.addRow([
        r.kind,
        r.name,
        r.channel,
        r.level,
        r.elearning ? "มี" : "",
        r.done ? "เสร็จ" : "กำลังทำ",
        r.done ? r.when : "",
        round1(r.points),
        r.share,
        round1(r.myPoints),
      ])
      row.getCell(9).numFmt = "0%"
      hair(row)
    })
    ws.addRow([])
    ws.addRow(["", "คะแนนงานเสร็จ", "", "", "", "", "", "", "", round1(p.donePoints)]).font = { bold: true }
    ws.addRow(["", "คะแนนงานที่กำลังทำ", "", "", "", "", "", "", "", round1(p.loadPoints)]).font = { bold: true }
    ;[12, 48, 14, 8, 11, 10, 14, 11, 9, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w))
    ws.getColumn(2).alignment = { wrapText: true, vertical: "top" }
    ws.views = [{ state: "frozen", ySplit: 3 }]
  })

  // How points are counted
  const rules = wb.addWorksheet(sheetName("วิธีคิดคะแนน", used))
  title(rules, "วิธีคิดคะแนน", 3)
  header(rules, ["ปัจจัย", "คะแนน", "หมายเหตุ"])
  ;(["high", "medium", "low"] as const).forEach((l) =>
    hair(rules.addRow([`หมวด ${LEVEL_LABEL[l]}`, weights[l], LEVEL_HINT[l]]))
  )
  hair(rules.addRow(["มี e-Learning", weights.elearning, "งานช่องทาง ttb มี e-Learning เสมอ"]))
  hair(rules.addRow(["เนื้อหาใหม่", weights.newContent, ""]))
  hair(rules.addRow(["Audit: ประสานงาน", weights.audit, "งานที่แก้ไฟล์เก่า ได้ 1 ครั้งต่องาน"]))
  hair(rules.addRow(["Audit: ต่อไฟล์", weights.perFile, "ต่อ 1 ไฟล์ที่แก้"]))
  hair(rules.addRow(["Refresher", weights.refresher, "ต่อ 1 บทเรียน"]))
  hair(rules.addRow(["ปรับมือ", "±1", ""]))
  hair(rules.addRow(["ทำหลายคน", "", "แบ่งตาม % ที่ตั้งไว้ ถ้าไม่ได้ตั้งแบ่งเท่ากัน"]))
  rules.getColumn(1).width = 18
  rules.getColumn(2).width = 10
  rules.getColumn(3).width = 44

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  )
  const link = document.createElement("a")
  link.download = `CD-Team-KPI_${year}.xlsx`
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
