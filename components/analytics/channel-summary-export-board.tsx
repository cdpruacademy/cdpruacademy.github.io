"use client"

import * as React from "react"
import { ProductItem } from "@/lib/timeline-data"
import { Partner, UNASSIGNED_PARTNER, partnerOf, tintOf } from "@/lib/partners"
import { Icon } from "@/components/icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface ChannelSummaryExportBoardProps {
  selectedPeriod: string
  isAnnual: boolean
  products: ProductItem[]
  enhancements: ProductItem[]
  /** Refresher and Audit work, counted like Analytics does */
  refreshers?: ProductItem[]
  audits?: ProductItem[]
  partners: Partner[]
}

interface PartnerStat {
  partner: Partner
  total: number
  newProduct: number
  enhancement: number
  refresher: number
  audit: number
  channels: { name: string; total: number }[]
}

/** The partner summary image the LINE bot sends (1200px wide, captured off-screen). */
export const ChannelSummaryExportBoard = React.forwardRef<
  HTMLDivElement,
  ChannelSummaryExportBoardProps
>(({ selectedPeriod, products, enhancements, refreshers = [], audits = [], partners }, ref) => {
  const { rows, total } = React.useMemo(() => {
    const map = new Map<string, PartnerStat>()
    const add = (item: ProductItem, kind: "np" | "enh" | "ref" | "aud") => {
      const partner = partnerOf(item.broker, partners)
      const row = map.get(partner.id) || {
        partner,
        total: 0,
        newProduct: 0,
        enhancement: 0,
        refresher: 0,
        audit: 0,
        channels: [],
      }
      row.total += 1
      if (kind === "np") row.newProduct += 1
      else if (kind === "enh") row.enhancement += 1
      else if (kind === "ref") row.refresher += 1
      else row.audit += 1
      const name = (item.broker || "Other").trim()
      const ch = row.channels.find((c) => c.name === name)
      if (ch) ch.total += 1
      else row.channels.push({ name, total: 1 })
      map.set(partner.id, row)
    }
    products.forEach((p) => add(p, "np"))
    enhancements.forEach((e) => add(e, "enh"))
    refreshers.forEach((r) => add(r, "ref"))
    audits.forEach((a) => add(a, "aud"))
    const order = [...partners, UNASSIGNED_PARTNER].map((p) => p.id)
    return {
      rows: Array.from(map.values()).sort(
        (a, b) => b.total - a.total || order.indexOf(a.partner.id) - order.indexOf(b.partner.id)
      ),
      total: products.length + enhancements.length + refreshers.length + audits.length,
    }
  }, [products, enhancements, refreshers, audits, partners])

  const maxTotal = Math.max(1, ...rows.map((r) => r.total))
  const kinds = [
    { label: "New Product", short: "NP", count: products.length, key: "newProduct" as const, tint: 0 },
    { label: "Enhancement", short: "Enh", count: enhancements.length, key: "enhancement" as const, tint: 0.35 },
    { label: "Refresher", short: "Ref", count: refreshers.length, key: "refresher" as const, tint: 0.62 },
    { label: "Audit", short: "Audit", count: audits.length, key: "audit" as const, tint: 0.82 },
  ].filter((k) => k.count > 0 || k.key === "newProduct" || k.key === "enhancement")
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const shade = (color: string, tint: number) => (tint ? tintOf(color, tint) : color)

  return (
    <div ref={ref} style={{ width: "1200px" }} className="flex flex-col bg-paper font-sans text-ink">
      <div className="flex items-end justify-between gap-6 bg-pru-red px-10 pt-7 pb-20 text-white">
        <div className="flex flex-col gap-3">
          <div className="text-xl font-bold">Projects by partner · {selectedPeriod}</div>
          <div className="flex items-end gap-4">
            <span className="text-[112px] leading-[0.82] font-bold tracking-[-0.04em]">{total}</span>
            <span className="pb-1 text-[26px] leading-tight font-bold">
              Projects
              <span className="block text-[15px] font-medium">
                {kinds.map((k) => `${k.label} ${k.count} (${pct(k.count)}%)`).join(" · ")}
              </span>
            </span>
          </div>
        </div>
        <span className="inline-flex rounded-2xl bg-white px-3.5 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/prudential-logo-th.png`} alt="พรูเด็นเชียล ประกันชีวิต" style={{ height: 34, width: "auto" }} />
        </span>
      </div>

      <div className="-mt-12 px-10">
        <div className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => (
            <div key={r.partner.id} className="grid grid-cols-[260px_minmax(0,1fr)_120px] items-center gap-5 border-b border-surface px-6 py-4">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: r.partner.color }}>
                  <Icon name="partner" size={22} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <b className="text-lg">{r.partner.name}</b>
                  <span className="truncate text-xs text-ink-soft">
                    {r.channels.map((c) => `${c.name} ${c.total}`).join(" · ")}
                  </span>
                </span>
              </span>
              <span className="flex h-6 overflow-hidden rounded-lg bg-surface">
                {kinds.map((k) => (
                  <span key={k.key} style={{ width: `${(r[k.key] / maxTotal) * 100}%`, background: shade(r.partner.color, k.tint) }} />
                ))}
              </span>
              <span className="text-right">
                <b className="text-[26px] leading-none">{r.total}</b>
                <span className="block text-xs text-ink-soft">
                  {kinds.filter((k) => r[k.key] > 0 || k.key === "newProduct" || k.key === "enhancement").map((k) => `${k.short} ${r[k.key]}`).join(" · ")}
                </span>
              </span>
            </div>
          ))}
          <div className="flex gap-6 px-6 py-3 text-[13px] text-ink-soft">
            {kinds.map((k, i) => (
              <span key={k.key} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-5 rounded-sm" style={{ background: shade("#4E565C", k.tint) }} />
                {i === 0 ? "เข้มสุด = " : ""}
                {k.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-10 pt-4 pb-5 text-center text-xs text-ink-soft">
        Confidential: เอกสารนี้จัดทำขึ้นเพื่อใช้ภายในฝ่ายพัฒนาหลักสูตรเท่านั้น
      </div>
    </div>
  )
})

ChannelSummaryExportBoard.displayName = "ChannelSummaryExportBoard"
