"use client";

import * as React from "react";
import { ProductItem } from "@/lib/timeline-data";
import { resolveBrokerColor } from "@/lib/broker-colors";
import { Calendar, Layers } from "lucide-react";

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
  const {
    channelStats,
    totalAll,
    totalProducts,
    totalEnhancements,
    maxTotal,
    npPercentage,
    enhPercentage,
  } = React.useMemo(() => {
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
    const npPct = totalAllCount > 0 ? Math.round((products.length / totalAllCount) * 100) : 0;
    const enhPct = totalAllCount > 0 ? 100 - npPct : 0;

    return {
      channelStats: stats,
      totalAll: totalAllCount,
      totalProducts: products.length,
      totalEnhancements: enhancements.length,
      maxTotal: highest,
      npPercentage: npPct,
      enhPercentage: enhPct,
    };
  }, [products, enhancements, colorMap]);

  // Thai Date Formatter
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
        backgroundColor: "#FFFFFF",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="p-8 text-slate-900 antialiased relative"
    >
      {/* 1. PR BRAND HEADER */}
      <div className="relative pb-6 mb-6 border-b border-slate-200">
        {/* Top Signature Prudential Red Ribbon */}
        <div className="absolute -top-8 -left-8 -right-8 h-2.5 bg-gradient-to-r from-[#ED1C24] via-[#FF3B30] to-[#C4121A]" />

        <div className="flex items-end justify-between gap-6 pt-2">
          {/* Brand & Main Headline */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#ED1C24] flex items-center justify-center text-white font-black text-lg shadow-sm">
                P
              </div>
              <span className="text-sm font-black tracking-widest text-[#ED1C24] uppercase">
                PRUDENTIAL THAILAND
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Product & Enhancement Release Report
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              สรุปจำนวนชิ้นงานพัฒนาตามช่องทางจำหน่าย
            </h1>
            <p className="text-xs font-medium text-slate-500">
              รายงานสัดส่วนการพัฒนาและส่งมอบผลิตภัณฑ์ แยกตามแต่ละช่องทางธุรกิจ
            </p>
          </div>

          {/* Period Badge & Date */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#ED1C24] text-xs font-black shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isAnnual ? "🌟 ภาพรวมทั้งปี 2569" : `รอบเดือน ${selectedPeriod}`}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              ข้อมูล ณ วันที่ {generatedDateText}
            </span>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE HIGHLIGHT BANNER (PR Infographic Style) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 mb-6 shadow-md border border-slate-800">
        <div className="grid grid-cols-12 gap-6 items-center">
          {/* Left Block: Total Workload */}
          <div className="col-span-4 border-r border-slate-800 pr-6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-extrabold uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5 text-red-500" />
              <span>ชิ้นงานพัฒนาทั้งหมด</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{totalAll}</span>
              <span className="text-sm font-bold text-slate-400">ชิ้นงาน</span>
            </div>
            <div className="mt-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ครอบคลุม {channelStats.length} ช่องทางจำหน่าย
              </span>
            </div>
          </div>

          {/* Right Block: New Product vs Enhancement Breakdown */}
          <div className="col-span-8 pl-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* New Product Stat */}
              <div className="bg-slate-800/70 border border-red-500/20 rounded-2xl p-3.5 px-4.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-400 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
                    <span>New Product</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-black text-white">{totalProducts}</span>
                    <span className="text-xs font-bold text-slate-400">ชิ้นงาน</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black">
                    {npPercentage}% ของงานทั้งหมด
                  </span>
                </div>
              </div>

              {/* Enhancement Stat */}
              <div className="bg-slate-800/70 border border-blue-500/20 rounded-2xl p-3.5 px-4.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-400 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
                    <span>Enhancement</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-black text-white">{totalEnhancements}</span>
                    <span className="text-xs font-bold text-slate-400">ชิ้นงาน</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black">
                    {enhPercentage}% ของงานทั้งหมด
                  </span>
                </div>
              </div>
            </div>

            {/* Unified Organization-wide Proportion Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400">
                <span>สัดส่วนประเภทงานภาพรวม</span>
                <span className="text-slate-300">
                  New Product {npPercentage}% • Enhancement {enhPercentage}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                {totalProducts > 0 && (
                  <div
                    style={{ width: `${(totalProducts / totalAll) * 100}%` }}
                    className="bg-[#ED1C24] h-full transition-all"
                  />
                )}
                {totalEnhancements > 0 && (
                  <div
                    style={{ width: `${(totalEnhancements / totalAll) * 100}%` }}
                    className="bg-[#0066CC] h-full transition-all"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHANNEL PERFORMANCE INFOGRAPHIC LIST */}
      <div className="space-y-3">
        {/* Section Title & Legend */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 tracking-tight">
              สัดส่วนงานพัฒนาแยกตามช่องทางจำหน่าย (Workload by Channel)
            </span>
            <span className="text-xs font-bold text-slate-400">
              (เรียงตามปริมาณงานสูงสุด)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-extrabold">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ED1C24]" />
              <span>New Product</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0066CC]" />
              <span>Enhancement</span>
            </div>
          </div>
        </div>

        {/* Channel Infographic Cards */}
        <div className="space-y-2">
          {channelStats.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              ไม่มีข้อมูลโครงการในรอบเวลานี้
            </div>
          ) : (
            channelStats.map((stat, idx) => {
              const npPct = stat.total > 0 ? (stat.newProductCount / stat.total) * 100 : 0;
              const enhPct = stat.total > 0 ? (stat.enhancementCount / stat.total) * 100 : 0;

              // Proportional width relative to top channel
              const barRelativeWidth = Math.max((stat.total / maxTotal) * 100, 10);

              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              let rankBadgeClass = "bg-slate-100 text-slate-600 border-slate-200 font-bold";
              if (isTop1) {
                rankBadgeClass = "bg-gradient-to-r from-amber-400 to-amber-500 text-white border-amber-500 font-black shadow-xs";
              } else if (isTop2) {
                rankBadgeClass = "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 border-slate-400 font-black shadow-xs";
              } else if (isTop3) {
                rankBadgeClass = "bg-gradient-to-r from-amber-700 to-amber-800 text-white border-amber-800 font-black shadow-xs";
              }

              return (
                <div
                  key={stat.channel}
                  className={`flex items-center gap-4 p-3 px-4 rounded-2xl border transition-all ${
                    isTop1
                      ? "bg-amber-50/30 border-amber-200 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${rankBadgeClass}`}
                  >
                    {idx + 1}
                  </div>

                  {/* Channel Identity */}
                  <div className="w-[180px] shrink-0 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-black/10"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="text-sm font-black text-slate-900 truncate">
                      {stat.channel}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 shrink-0">
                      ({stat.percentage.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Dual Segmented Visual Bar */}
                  <div className="flex-1 px-2">
                    <div
                      style={{ width: `${barRelativeWidth}%` }}
                      className="h-6 rounded-lg bg-slate-100 overflow-hidden flex shadow-xs transition-all"
                    >
                      {stat.newProductCount > 0 && (
                        <div
                          style={{ width: `${npPct}%` }}
                          className="bg-[#ED1C24] h-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                          title={`New Product: ${stat.newProductCount}`}
                        >
                          {stat.newProductCount >= 1 && npPct >= 18 ? stat.newProductCount : ""}
                        </div>
                      )}
                      {stat.enhancementCount > 0 && (
                        <div
                          style={{ width: `${enhPct}%` }}
                          className="bg-[#0066CC] h-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                          title={`Enhancement: ${stat.enhancementCount}`}
                        >
                          {stat.enhancementCount >= 1 && enhPct >= 18 ? stat.enhancementCount : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Tasks & Category Chips */}
                  <div className="w-[190px] shrink-0 flex items-center justify-end gap-2 text-right">
                    <span className="text-base font-black text-slate-900">
                      {stat.total} <span className="text-xs font-bold text-slate-500">ชิ้น</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {stat.newProductCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#ED1C24] border border-red-200/80 text-[11px] font-black">
                          New {stat.newProductCount}
                        </span>
                      )}
                      {stat.enhancementCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0066CC] border border-blue-200/80 text-[11px] font-black">
                          Enh {stat.enhancementCount}
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

      {/* 4. Elegant Bottom Signature (PR Accent, No Curriculum or Website URL) */}
      <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ED1C24]" />
          <span className="font-bold uppercase tracking-wider text-slate-500">
            Prudential Life Assurance (Thailand) Public Company Limited
          </span>
        </div>
        <div className="font-semibold text-slate-400">
          Executive Infographic Summary
        </div>
      </div>
    </div>
  );
});

ChannelSummaryExportBoard.displayName = "ChannelSummaryExportBoard";
