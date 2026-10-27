// Partners own a brand colour; channels sit under a partner (see PRODUCT.md).
// A project's existing `broker` text is the channel name, so saved records stay unchanged.

export interface Partner {
  id: string
  name: string
  color: string
  channels: string[]
}

// Starting colours are read from each partner's logo (no bank publishes official hex codes)
export const DEFAULT_PARTNERS: Partner[] = [
  { id: "ttb", name: "ttb", color: "#0B2E6F", channels: ["ttb", "ttb touch"] },
  { id: "uob", name: "UOB", color: "#005CB9", channels: ["UOB", "Digital-UOB"] },
  {
    id: "prudential",
    name: "Prudential",
    color: "#ED1B2E",
    channels: ["Agency", "DMTM", "D2C"],
  },
  { id: "cimb", name: "CIMB THAI", color: "#7A1E3A", channels: ["CIMB"] },
  {
    id: "thai-credit",
    name: "Thai Credit",
    color: "#F28C28",
    channels: ["Thai Credit"],
  },
]

/** Group for channels that no partner lists yet */
export const UNASSIGNED_PARTNER: Partner = {
  id: "unassigned",
  name: "Other",
  color: "#A8A29E",
  channels: [],
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

/** The partner a channel (a project's `broker`) belongs to */
export function partnerOf(
  channel: string | undefined,
  partners: Partner[]
): Partner {
  if (!channel) return UNASSIGNED_PARTNER
  const key = norm(channel)
  const exact = partners.find((p) => p.channels.some((c) => norm(c) === key))
  if (exact) return exact
  // Names like "ttb touch app" or "CIMB THAI" still find their partner
  const loose = partners.find(
    (p) =>
      key.includes(norm(p.name)) ||
      p.channels.some((c) => key.includes(norm(c)) || norm(c).includes(key))
  )
  return loose || UNASSIGNED_PARTNER
}

function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export const isHexColor = (c: string) => /^#[0-9a-f]{6}$/i.test(c)

/** White or ink, whichever reads on the colour (Prudential red keeps white text) */
export function textOn(hex: string): string {
  if (!isHexColor(hex)) return "#FFFFFF"
  return 1.05 / (luminance(hex) + 0.05) >= 4 ? "#FFFFFF" : "#1C1917"
}

/** The colour darkened until it reads as text on white (4.5:1) */
export function inkOf(hex: string): string {
  if (!isHexColor(hex)) return hex
  let rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  let out = hex
  for (let i = 0; i < 20 && 1.05 / (luminance(out) + 0.05) < 4.5; i++) {
    rgb = rgb.map((v) => Math.round(v * 0.9))
    out = "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("")
  }
  return out
}

/** A light tint of the colour, for group bands */
export function tintOf(hex: string, amount = 0.07): string {
  if (!isHexColor(hex)) return "#F5F5F4"
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (
    "#" +
    rgb
      .map((v) => Math.round(255 - (255 - v) * amount))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  )
}

/** True when two colours are close enough to be confused */
export function isNearColor(a: string, b: string): boolean {
  if (!isHexColor(a) || !isHexColor(b)) return false
  const x = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const y = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) < 60
}

/** Channels used by projects that no partner lists */
export function unassignedChannels(
  used: string[],
  partners: Partner[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  used.forEach((ch) => {
    const name = ch.trim()
    if (!name || seen.has(norm(name))) return
    seen.add(norm(name))
    if (partnerOf(name, partners).id === UNASSIGNED_PARTNER.id) out.push(name)
  })
  return out
}
