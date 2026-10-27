"use client"

import * as React from "react"
import { ProductItem } from "@/lib/timeline-data"
import { Eyebrow, PruIcon } from "@/components/pru-icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
// Ranking rows shown before the rest are grouped as "อื่นๆ"
const TOP_CHANNELS = 9

interface ChannelSummaryExportBoardProps {
  selectedPeriod: string
  isAnnual: boolean
  products: ProductItem[]
  enhancements: ProductItem[]
  colorMap: Record<string, string>
}

interface ChannelStat {
  channel: string
  total: number
  newProductCount: number
  enhancementCount: number
}

/** The channel summary image the LINE bot sends (1200px wide, captured off-screen). */
export const ChannelSummaryExportBoard = React.forwardRef<
  HTMLDivElement,
  ChannelSummaryExportBoardProps
>(({ selectedPeriod, products, enhancements }, ref) => {
  const { rows, totalAll, channelCount, top, npPercentage, enhPercentage } =
    React.useMemo(() => {
      const map: Record<string, ChannelStat> = {}
      const add = (item: ProductItem, kind: "np" | "enh") => {
        const ch = (item.broker || "Other").trim()
        map[ch] = map[ch] || {
          channel: ch,
          total: 0,
          newProductCount: 0,
          enhancementCount: 0,
        }
        map[ch].total += 1
        if (kind === "np") map[ch].newProductCount += 1
        else map[ch].enhancementCount += 1
      }
      products.forEach((p) => add(p, "np"))
      enhancements.forEach((e) => add(e, "enh"))

      const stats = Object.values(map).sort(
        (a, b) => b.total - a.total || a.channel.localeCompare(b.channel)
      )
      const shown =
        stats.length > TOP_CHANNELS + 1 ? stats.slice(0, TOP_CHANNELS) : stats
      const rest = stats.slice(shown.length)
      const restRow: ChannelStat | null = rest.length
        ? {
            channel: `อื่นๆ ${rest.length} ช่องทาง`,
            total: rest.reduce((s, r) => s + r.total, 0),
            newProductCount: rest.reduce((s, r) => s + r.newProductCount, 0),
            enhancementCount: rest.reduce((s, r) => s + r.enhancementCount, 0),
          }
        : null

      const total = products.length + enhancements.length
      const np = total > 0 ? Math.round((products.length / total) * 100) : 0
      return {
        rows: [
          ...shown.map((r, i) => ({ ...r, rank: String(i + 1) })),
          ...(restRow ? [{ ...restRow, rank: "–" }] : []),
        ],
        totalAll: total,
        channelCount: stats.length,
        top: stats[0] || null,
        npPercentage: np,
        enhPercentage: total > 0 ? 100 - np : 0,
      }
    }, [products, enhancements])

  const maxTotal = Math.max(1, ...rows.map((r) => r.total))
  const generatedDate = React.useMemo(() => {
    const d = new Date()
    const months = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
  }, [])

  return (
    <div
      ref={ref}
      style={{ width: "1200px" }}
      className="flex flex-col gap-7 bg-paper px-14 pt-10 pb-8 font-sans text-ink"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>สรุปตามช่องทาง · {selectedPeriod}</Eyebrow>
          <div className="text-[44px] leading-tight font-bold">
            {top ? (
              <>
                <span className="text-pru-red">{top.channel}</span>{" "}
                มีงานมากที่สุด {top.total} ชิ้น
              </>
            ) : (
              "ยังไม่มีงานในช่วงนี้"
            )}
          </div>
          <div className="text-lg text-ink-soft">
            จากทั้งหมด {totalAll} ชิ้นงาน ใน {channelCount} ช่องทาง · ข้อมูล ณ{" "}
            {generatedDate}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_PATH}/prudential-logo-th.png`}
          alt="พรูเด็นเชียล ประกันชีวิต"
          style={{ width: 240, height: "auto" }}
        />
      </div>

      <div className="grid grid-cols-[320px_1fr_1fr] gap-6">
        <div className="relative bg-pru-red px-7 py-6 text-white">
          <PruIcon
            name="document"
            size={56}
            strokeWidth={3}
            className="absolute top-6 right-6"
          />
          <div className="text-2xl font-bold">ชิ้นงานทั้งหมด</div>
          <div className="text-[96px] leading-none font-bold">{totalAll}</div>
        </div>
        <div className="flex flex-col justify-between gap-4 border-2 border-rule bg-white px-7 py-6">
          <div className="flex items-center gap-2.5 text-xl font-bold">
            <PruIcon name="star" size={28} className="text-pru-red" />
            New Product
          </div>
          <div className="text-[64px] leading-none font-bold">
            {products.length}{" "}
            <span className="text-[22px] font-normal text-ink-soft">
              ชิ้น · {npPercentage}%
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 border-2 border-rule bg-white px-7 py-6">
          <div className="flex items-center gap-2.5 text-xl font-bold">
            <PruIcon name="chart" size={28} className="text-pru-red" />
            Enhancement
          </div>
          <div className="text-[64px] leading-none font-bold">
            {enhancements.length}{" "}
            <span className="text-[22px] font-normal text-ink-soft">
              ชิ้น · {enhPercentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="border-2 border-rule bg-white">
        <div className="grid grid-cols-[56px_240px_1fr_140px] gap-5 border-b-[3px] border-ink px-7 pt-3.5 pb-2.5 text-base font-bold text-ink-soft">
          <div>อันดับ</div>
          <div>ช่องทาง</div>
          <div className="flex items-center gap-5">
            สัดส่วนงาน
            <span className="inline-flex items-center gap-2 font-normal">
              <span className="h-3.5 w-3.5 bg-pru-red" /> New Product
            </span>
            <span className="inline-flex items-center gap-2 font-normal">
              <span className="h-3.5 w-3.5 bg-gray-400" /> Enhancement
            </span>
          </div>
          <div className="text-right">New / Enh</div>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.channel}
            className="grid grid-cols-[56px_240px_1fr_140px] items-center gap-5 border-b-2 border-rule px-7 py-3.5 last:border-b-0"
          >
            <div
              className={`text-[22px] font-bold ${i === 0 ? "text-pru-red" : ""}`}
            >
              {row.rank}
            </div>
            <div className="truncate text-[22px] font-bold">{row.channel}</div>
            <div className="flex items-center gap-3.5">
              <span
                className="flex h-6"
                style={{ width: `${(row.total / maxTotal) * 78}%` }}
              >
                <span
                  className="bg-pru-red"
                  style={{
                    width: `${row.total ? (row.newProductCount / row.total) * 100 : 0}%`,
                  }}
                />
                <span
                  className="bg-gray-400"
                  style={{
                    width: `${row.total ? (row.enhancementCount / row.total) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="text-[22px] font-bold">{row.total}</span>
            </div>
            <div className="text-right text-lg text-ink-soft">
              {row.newProductCount} / {row.enhancementCount}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm whitespace-nowrap text-ink-soft">
        Confidential: เอกสารนี้จัดทำขึ้นเพื่อใช้ภายในฝ่ายพัฒนาหลักสูตรเท่านั้น
      </div>
    </div>
  )
})

ChannelSummaryExportBoard.displayName = "ChannelSummaryExportBoard"
