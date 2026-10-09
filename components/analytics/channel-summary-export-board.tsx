"use client";

import * as React from "react";
import { ProductItem } from "@/lib/timeline-data";
import { resolveBrokerColor } from "@/lib/broker-colors";
import { Calendar, CheckCircle2 } from "lucide-react";

interface ChannelSummaryExportBoardProps {
  selectedPeriod: string;
  isAnnual: boolean;
  products: ProductItem[];
  enhancements: ProductItem[];
  colorMap: Record<string, string>;
}

interface ChannelStat {
  channel: string;
  total: number;
  newProductCount: number;
  enhancementCount: number;
  percentage: number;
  color: string;
}

export const ChannelSummaryExportBoard = React.forwardRef<
  HTMLDivElement,
  ChannelSummaryExportBoardProps
>(({ selectedPeriod, isAnnual, products, enhancements, colorMap }, ref) => {
  // Aggregate statistics per channel
  const { channelStats, totalAll, totalProducts, totalEnhancements, maxTotal } = React.useMemo(() => {
    const map: Record<
      string,
      { channel: string; total: number; newProductCount: number; enhancementCount: number }
    > = {};

    products.forEach((p) => {
      const ch = (p.broker || "Other").trim();
      if (!map[ch]) {
        map[ch] = { channel: ch, total: 0, newProductCount: 0, enhancementCount: 0 };
      }
      map[ch].total += 1;
      map[ch].newProductCount += 1;
    });

    enhancements.forEach((e) => {
      const ch = (e.broker || "Other").trim();
      if (!map[ch]) {
        map[ch] = { channel: ch, total: 0, newProductCount: 0, enhancementCount: 0 };
      }
      map[ch].total += 1;
      map[ch].enhancementCount += 1;
    });

    const totalAllCount = products.length + enhancements.length;
    const stats: ChannelStat[] = Object.values(map)
      .map((item) => ({
        ...item,
        color: resolveBrokerColor(item.channel, colorMap) || "#64748B",
        percentage: totalAllCount > 0 ? (item.total / totalAllCount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total || a.channel.localeCompare(b.channel));

    const highest = stats.length > 0 ? Math.max(...stats.map((s) => s.total), 1) : 1;

    return {
      channelStats: stats,
      totalAll: totalAllCount,
      totalProducts: products.length,
      totalEnhancements: enhancements.length,
      maxTotal: highest,
    };
  }, [products, enhancements, colorMap]);

  // Thai Date Formatter for footer
  const generatedDateText = React.useMemo(() => {
    const d = new Date();
    const monthsTh = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${d.getDate()} ${monthsTh[d.getMonth()]} ${d.getFullYear() + 543}`;
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: "1200px",
        backgroundColor: "#F8FAFC",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="p-7 text-slate-800 antialiased"
    >
      {/* 1. Header Banner (Compact & Clean) */}
      <div className="relative bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs mb-4 overflow-hidden flex items-center justify-between gap-4">
        {/* Top Prudential Red Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ED1C24]" />

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#ED1C24] flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-[#ED1C24]">
                PRUDENTIAL
              </span>
              <span className="text-xs font-bold text-slate-300">|</span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Curriculum Development Team
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              สรุปจำนวนชิ้นงานพัฒนาตามช่องทาง (Summary by Channel)
            </h1>
          </div>
        </div>

        {/* Period & Date badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-50 text-[#ED1C24] border border-red-200/80 text-xs font-black">
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAnnual ? "🌟 ภาพรวมทั้งปี 2569" : `📅 ${selectedPeriod}`}</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            ณ วันที่ {generatedDateText}
          </span>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Sleek, Premium & Compact Executive Trio) */}
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        {/* Card 1: Total Projects */}
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 px-4.5 border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
              ชิ้นงานรวมทั้งหมด
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black tracking-tight text-white">{totalAll}</span>
              <span className="text-xs font-bold text-slate-400">ชิ้นงาน</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-black border border-slate-700/80 shadow-2xs">
              {channelStats.length} ช่องทาง
            </span>
          </div>
        </div>

        {/* Card 2: New Product */}
        <div className="bg-gradient-to-br from-white via-white to-red-50/50 rounded-2xl p-3.5 px-4.5 border border-red-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
              <span className="text-[11px] font-extrabold text-[#ED1C24] uppercase tracking-wider">
                New Product
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black tracking-tight text-[#ED1C24]">{totalProducts}</span>
              <span className="text-xs font-bold text-slate-500">ชิ้นงาน</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-xl bg-red-50 text-[#ED1C24] text-xs font-black border border-red-200/80 shadow-2xs">
              {totalAll > 0 ? `${((totalProducts / totalAll) * 100).toFixed(0)}% ของงานทั้งหมด` : "0%"}
            </span>
          </div>
        </div>

        {/* Card 3: Enhancement */}
        <div className="bg-gradient-to-br from-white via-white to-blue-50/50 rounded-2xl p-3.5 px-4.5 border border-blue-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
              <span className="text-[11px] font-extrabold text-[#0066CC] uppercase tracking-wider">
                Enhancement
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black tracking-tight text-[#0066CC]">{totalEnhancements}</span>
              <span className="text-xs font-bold text-slate-500">ชิ้นงาน</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-xl bg-blue-50 text-[#0066CC] text-xs font-black border border-blue-200/80 shadow-2xs">
              {totalAll > 0 ? `${((totalEnhancements / totalAll) * 100).toFixed(0)}% ของงานทั้งหมด` : "0%"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Compact Channel Ranking Board (มองเห็นครบในหน้าเดียว ไม่ต้องเลื่อน) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mb-4">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-5 py-2.5 bg-slate-50/90 text-slate-500 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
          <div className="col-span-4">อันดับ & ช่องทาง (Channel)</div>
          <div className="col-span-5 px-2 flex items-center justify-between">
            <span>เปรียบเทียบสัดส่วนชิ้นงาน (Workload)</span>
            <span className="text-[10px] font-bold text-slate-400 normal-case flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-[#ED1C24]" />New Product</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-[#0066CC]" />Enhancement</span>
            </span>
          </div>
          <div className="col-span-3 text-right">จำนวนชิ้นงาน (Total Tasks)</div>
        </div>

        {/* Channel Rows */}
        <div className="divide-y divide-slate-100">
          {channelStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">
              ไม่มีข้อมูลโครงการในรอบเวลานี้
            </div>
          ) : (
            channelStats.map((stat, idx) => {
              const npPct = stat.total > 0 ? (stat.newProductCount / stat.total) * 100 : 0;
              const enhPct = stat.total > 0 ? (stat.enhancementCount / stat.total) * 100 : 0;

              // Relative bar width compared to the channel with the most projects
              const barRelativeWidth = Math.max((stat.total / maxTotal) * 100, 12);

              // Rank style
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              let rankBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
              let rankText = `#${idx + 1}`;
              if (isTop1) {
                rankBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-black";
                rankText = "🥇 1";
              } else if (isTop2) {
                rankBadgeClass = "bg-slate-200 text-slate-800 border-slate-300 font-black";
                rankText = "🥈 2";
              } else if (isTop3) {
                rankBadgeClass = "bg-orange-100 text-orange-900 border-orange-300 font-black";
                rankText = "🥉 3";
              }

              return (
                <div
                  key={stat.channel}
                  className="grid grid-cols-12 px-5 py-2.5 items-center hover:bg-slate-50/70 transition-colors"
                >
                  {/* Col 1: Rank & Channel Name */}
                  <div className="col-span-4 flex items-center gap-2.5">
                    <span
                      className={`w-11 py-0.5 rounded-lg text-center text-xs font-black border shadow-2xs shrink-0 ${rankBadgeClass}`}
                    >
                      {rankText}
                    </span>

                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-black/10"
                      style={{ backgroundColor: stat.color }}
                    />

                    <span className="text-sm font-black text-slate-900 tracking-tight truncate">
                      {stat.channel}
                    </span>

                    <span className="text-[11px] font-bold text-slate-400">
                      ({stat.percentage.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Col 2: Proportional Segmented Bar (ความยาวแปรผันตามจำนวนงานจริง) */}
                  <div className="col-span-5 px-2">
                    <div
                      style={{ width: `${barRelativeWidth}%` }}
                      className="h-5 rounded-md bg-slate-100 overflow-hidden flex shadow-2xs transition-all"
                    >
                      {stat.newProductCount > 0 && (
                        <div
                          style={{ width: `${npPct}%` }}
                          className="bg-[#ED1C24] h-full flex items-center justify-center text-[11px] font-black text-white"
                          title={`New Product: ${stat.newProductCount}`}
                        >
                          {stat.newProductCount >= 1 && npPct >= 25 ? stat.newProductCount : ""}
                        </div>
                      )}
                      {stat.enhancementCount > 0 && (
                        <div
                          style={{ width: `${enhPct}%` }}
                          className="bg-[#0066CC] h-full flex items-center justify-center text-[11px] font-black text-white"
                          title={`Enhancement: ${stat.enhancementCount}`}
                        >
                          {stat.enhancementCount >= 1 && enhPct >= 25 ? stat.enhancementCount : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Clean Exact Numbers (Total + Active Type Badges) */}
                  <div className="col-span-3 flex items-center justify-end gap-2 text-right">
                    <span className="text-base font-black text-slate-900">
                      {stat.total} <span className="text-xs font-bold text-slate-500">ชิ้นงาน</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {stat.newProductCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[#ED1C24] border border-red-200/80 text-[11px] font-black">
                          🔴 {stat.newProductCount}
                        </span>
                      )}
                      {stat.enhancementCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[#0066CC] border border-blue-200/80 text-[11px] font-black">
                          🔵 {stat.enhancementCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Footer Watermark (Minimal) */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Curriculum Development Team • Prudential Life Assurance (Thailand)</span>
        </div>
        <div>
          <span>Dashboard: https://cdpruacademy.github.io/</span>
        </div>
      </div>
    </div>
  );
});

ChannelSummaryExportBoard.displayName = "ChannelSummaryExportBoard";
