"use client";

import * as React from "react";
import { ProductItem } from "@/lib/timeline-data";
import { resolveBrokerColor } from "@/lib/broker-colors";
import { Layers, Sparkles, Zap, Tag, Calendar, CheckCircle2, TrendingUp, Award } from "lucide-react";

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
  const { channelStats, totalAll, totalProducts, totalEnhancements } = React.useMemo(() => {
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

    return {
      channelStats: stats,
      totalAll: totalAllCount,
      totalProducts: products.length,
      totalEnhancements: enhancements.length,
    };
  }, [products, enhancements, colorMap]);

  // Thai Date Formatter for footer
  const generatedDateText = React.useMemo(() => {
    const d = new Date();
    const monthsTh = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${d.getDate()} ${monthsTh[d.getMonth()]} ${d.getFullYear() + 543} (ข้อมูลล่าสุด)`;
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: "1280px",
        backgroundColor: "#F8FAFC",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="p-10 border border-slate-200 text-slate-800 antialiased"
    >
      {/* 1. Header Banner */}
      <div className="relative bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm flex items-center justify-between gap-6 mb-7 overflow-hidden">
        {/* Top Prudential Brand Red Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ED1C24] via-[#ED1C24] to-[#ff4d54]" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ED1C24] flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
            P
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black tracking-tight text-[#ED1C24]">
                PRUDENTIAL
              </span>
              <span className="text-xs font-bold text-slate-300">|</span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Curriculum Development Team
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              สรุปจำนวนชิ้นงานพัฒนา แยกตามช่องทาง (Summary of Projects by Channel)
            </h1>
          </div>
        </div>

        {/* Period & Time badge */}
        <div className="text-right flex flex-col items-end gap-1.5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-[#ED1C24] border border-red-200 text-xs font-black shadow-xs">
            <Calendar className="w-4 h-4" />
            <span>{isAnnual ? "🌟 ภาพรวมทั้งปี 2569 (All Year)" : `📅 รอบเดือน: ${selectedPeriod}`}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            อัปเดต ณ วันที่: {generatedDateText}
          </span>
        </div>
      </div>

      {/* 2. Executive KPI Cards (4 Cards Grid) */}
      <div className="grid grid-cols-4 gap-5 mb-7">
        {/* Card 1: Total Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              ชิ้นงานรวมทั้งหมด
            </span>
            <div className="text-4xl font-black text-slate-900 mt-1 tracking-tight">
              {totalAll}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              โครงการทั้งหมดที่พัฒนา
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: New Products */}
        <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-[#ED1C24] uppercase tracking-wider">
              New Product
            </span>
            <div className="text-4xl font-black text-[#ED1C24] mt-1 tracking-tight">
              {totalProducts}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              {totalAll > 0 ? `${((totalProducts / totalAll) * 100).toFixed(0)}% ของงานทั้งหมด` : "0%"}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-red-50 text-[#ED1C24] flex items-center justify-center shadow-xs shrink-0 border border-red-100">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Enhancements */}
        <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-[#0066CC] uppercase tracking-wider">
              Enhancement
            </span>
            <div className="text-4xl font-black text-[#0066CC] mt-1 tracking-tight">
              {totalEnhancements}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              {totalAll > 0 ? `${((totalEnhancements / totalAll) * 100).toFixed(0)}% ของงานทั้งหมด` : "0%"}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 text-[#0066CC] flex items-center justify-center shadow-xs shrink-0 border border-blue-100">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Channels */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              ช่องทางที่เปิดขาย
            </span>
            <div className="text-4xl font-black text-slate-900 mt-1 tracking-tight">
              {channelStats.length}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              พาร์ทเนอร์/โบรกเกอร์ที่มีงาน
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs shrink-0 border border-emerald-100">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Overall Channel Share Visual Strip (Glanceable Macro-View) */}
      {channelStats.length > 0 && totalAll > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm mb-7">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#ED1C24]" />
              <span className="text-sm font-black text-slate-900">
                สัดส่วนงานรวมแยกตามช่องทาง (Overall Channel Distribution)
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              รวม 100% ({totalAll} ชิ้นงาน)
            </span>
          </div>

          {/* Full-width Multi-Color Distribution Bar */}
          <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner">
            {channelStats.map((stat) => (
              <div
                key={stat.channel}
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.color,
                }}
                className="h-full transition-all"
                title={`${stat.channel}: ${stat.total} ชิ้น (${stat.percentage.toFixed(0)}%)`}
              />
            ))}
          </div>

          {/* Legend Tags */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
            {channelStats.map((stat) => (
              <div
                key={stat.channel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-extrabold text-slate-700"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: stat.color }}
                />
                <span>{stat.channel}</span>
                <span className="text-slate-400 font-bold">
                  {stat.percentage.toFixed(0)}%
                </span>
                <span className="text-[#ED1C24] font-black ml-0.5">
                  ({stat.total})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. High-Impact Channel Cards List (มองแป๊บเดียวรู้ทันทีว่าช่องทางไหนมีงานกี่ตัว) */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#ED1C24]" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              รายละเอียดชิ้นงานตามช่องทาง (Channel Breakdown)
            </h2>
          </div>
          <span className="text-xs font-extrabold text-slate-400">
            เรียงตามจำนวนโครงการสูงสุด (Ranked by Total Projects)
          </span>
        </div>

        {channelStats.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-bold text-base border border-slate-200">
            ไม่มีข้อมูลโครงการในรอบเวลานี้
          </div>
        ) : (
          <div className="space-y-4">
            {channelStats.map((stat, idx) => {
              const npPct = stat.total > 0 ? (stat.newProductCount / stat.total) * 100 : 0;
              const enhPct = stat.total > 0 ? (stat.enhancementCount / stat.total) * 100 : 0;

              // Rank styling
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              let rankBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
              let rankText = `#${idx + 1}`;
              if (isTop1) {
                rankBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-black";
                rankText = "🥇 #1";
              } else if (isTop2) {
                rankBadgeClass = "bg-slate-200 text-slate-800 border-slate-300 font-black";
                rankText = "🥈 #2";
              } else if (isTop3) {
                rankBadgeClass = "bg-orange-100 text-orange-900 border-orange-300 font-black";
                rankText = "🥉 #3";
              }

              return (
                <div
                  key={stat.channel}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
                >
                  {/* Top Row: Channel Identity + Big Bold Total Count */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Rank & Channel */}
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black border shadow-2xs shrink-0 ${rankBadgeClass}`}
                      >
                        {rankText}
                      </span>

                      {/* Channel Name with Color Accent */}
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-black/10"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {stat.channel}
                        </span>
                      </div>

                      {/* Proportion Badge */}
                      <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold border border-slate-200/60">
                        {stat.percentage.toFixed(0)}% ของงานทั้งหมด
                      </span>
                    </div>

                    {/* Right: HERO NUMBER (มหึมา เด่นชัด มองเสี้ยววินาทีก็รู้ทันที!) */}
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-baseline gap-2 px-5 py-2 rounded-2xl bg-slate-900 text-white shadow-sm border border-slate-800">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                          รวม
                        </span>
                        <span className="text-3xl font-black tracking-tight text-white">
                          {stat.total}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          ชิ้นงาน
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Segmented Bar (Red = New Product, Blue = Enhancement) */}
                  <div className="w-full h-4.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner">
                    {stat.newProductCount > 0 && (
                      <div
                        style={{ width: `${npPct}%` }}
                        className="bg-gradient-to-r from-[#ED1C24] to-[#f43f47] h-full"
                        title={`New Product: ${stat.newProductCount} ชิ้น`}
                      />
                    )}
                    {stat.enhancementCount > 0 && (
                      <div
                        style={{ width: `${enhPct}%` }}
                        className="bg-gradient-to-r from-[#0066CC] to-[#1f7ae0] h-full"
                        title={`Enhancement: ${stat.enhancementCount} ชิ้น`}
                      />
                    )}
                  </div>

                  {/* Bottom Row: Detailed Pills (ชัดเจน แยกเป็นสี New Product vs Enhancement) */}
                  <div className="flex items-center justify-between text-xs font-bold pt-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 text-[#ED1C24] border border-red-200/70 font-black shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
                        <span>New Product:</span>
                        <span className="text-sm font-black">{stat.newProductCount}</span>
                        <span className="text-[11px] font-semibold text-red-500">
                          ({npPct.toFixed(0)}%)
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#0066CC] border border-blue-200/70 font-black shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
                        <span>Enhancement:</span>
                        <span className="text-sm font-black">{stat.enhancementCount}</span>
                        <span className="text-[11px] font-semibold text-blue-500">
                          ({enhPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs font-extrabold text-slate-400">
                      สัดส่วนช่องทาง: <span className="text-slate-700">{stat.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Elegant Bottom Bar / Watermark */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 pt-2 border-t border-slate-200/80">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>ฝ่ายพัฒนาหลักสูตร (Curriculum Development Team) • Prudential Life Assurance (Thailand)</span>
        </div>
        <div>
          <span>Dashboard: https://cdpruacademy.github.io/</span>
        </div>
      </div>
    </div>
  );
});

ChannelSummaryExportBoard.displayName = "ChannelSummaryExportBoard";
