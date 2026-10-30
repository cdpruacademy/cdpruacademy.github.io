import { ProductItem, TimelineType, parseTimelineDate } from "@/lib/timeline-data"

// An .ics file of launch and Internal Training dates that Outlook can import.
// Each event has a fixed UID, so importing again updates it instead of adding a copy.

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

/** Lines longer than 75 bytes continue on the next line after a space (RFC 5545) */
function fold(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ""
  let bytes = 0
  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > 74) {
      parts.push(current)
      current = " "
      bytes = 1
    }
    current += ch
    bytes += size
  }
  parts.push(current)
  return parts.join("\r\n")
}

/** A date with a day in it; "Nov 2026" or TBC is not a calendar date */
const dayDate = (value?: string) =>
  value && /\b\d{1,2}\b/.test(value) ? parseTimelineDate(value) : null

export function buildLaunchCalendar(
  items: { item: ProductItem; type: TimelineType }[],
  name: string
): { ics: string; count: number } {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
  const events: string[][] = []

  items.forEach(({ item, type }) => {
    const title = item.name.replace(/\s*\n\s*/g, " ").trim()
    const kind = type === "product" ? "New Product" : "Enhancement"
    const dates: [string, string, string | undefined][] = [
      ["launch", "Launch", item.commercialDate],
      ["training", "Internal Training", item.internalDate],
    ]
    dates.forEach(([key, label, value]) => {
      const d = dayDate(value)
      if (!d) return
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      events.push([
        "BEGIN:VEVENT",
        `UID:${item.id}-${key}@cdpruacademy.github.io`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(d)}`,
        `DTEND;VALUE=DATE:${ymd(end)}`,
        `SUMMARY:${escape(`${label} · ${title} (${item.broker || "–"})`)}`,
        `DESCRIPTION:${escape(`${kind} · ${item.owner || "–"}`)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ])
    })
  })

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PRU Academy//CD Team Dashboard//TH",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(name)}`,
    ...events.flat(),
    "END:VCALENDAR",
  ]
  return { ics: lines.map(fold).join("\r\n") + "\r\n", count: events.length }
}
