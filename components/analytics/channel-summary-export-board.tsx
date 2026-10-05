"use client";

import * as React from "react";
import { ProductItem } from "@/lib/timeline-data";
import { resolveBrokerColor } from "@/lib/broker-colors";
import { Layers, Sparkles, Zap, Tag, Calendar, CheckCircle2 } from "lucide-react";

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
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex items-center justify-between gap-6 mb-7">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-[#ED1C24] flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
            P
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black tracking-tight text-[#ED1C24]">
                PRUDENTIAL
              </span>
              <span className="text-xs font-bold text-slate-400">|</span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Curriculum Development Team
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              สรุปโครงการแยกตามช่องทาง (Summary of Projects by Channel)
            </h1>
          </div>
        </div>

        {/* Period & Time badge */}
        <div className="text-right flex flex-col items-end gap-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 text-[#ED1C24] border border-red-200 text-xs font-black shadow-xs">
            <Calendar className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
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

      {/* 3. Main Channel Breakdown Table (Clean, Focused, Premium) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-7">
        {/* Table Title Bar */}
        <div className="px-7 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-[#ED1C24]" />
            <h2 className="text-base font-black text-slate-900">
              รายละเอียดจำนวนชิ้นงาน จำแนกตามช่องทาง (Channel Breakdown)
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            เรียงตามจำนวนโครงการสูงสุด
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 px-7 py-3.5 bg-slate-100/70 text-slate-600 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
          <div className="col-span-4">ช่องทาง / พาร์ทเนอร์ (Channel)</div>
          <div className="col-span-2 text-center">จำนวนชิ้นงานรวม</div>
          <div className="col-span-5 px-3">สัดส่วน New Product / Enhancement</div>
          <div className="col-span-1 text-right">สัดส่วน (%)</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {channelStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">
              ไม่มีข้อมูลโครงการในรอบเวลานี้
            </div>
          ) : (
            channelStats.map((stat, idx) => {
              const npPct = stat.total > 0 ? (stat.newProductCount / stat.total) * 100 : 0;
              const enhPct = stat.total > 0 ? (stat.enhancementCount / stat.total) * 100 : 0;

              return (
                <div
                  key={stat.channel}
                  className="grid grid-cols-12 px-7 py-4 items-center hover:bg-slate-50/50 transition-colors"
                >
                  {/* Col 1: Channel Name & Color Dot */}
                  <div className="col-span-4 flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-black/10"
                      style={{ backgroundColor: stat.color }}
                    />
                    <div>
                      <span className="text-base font-black text-slate-900 tracking-tight">
                        {stat.channel}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold ml-2">
                        (อันดับ {idx + 1})
                      </span>
                    </div>
                  </div>

                  {/* Col 2: Total Task Count */}
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center px-3.5 py-1 rounded-xl bg-slate-100 text-slate-900 text-sm font-black">
                      {stat.total} ชิ้นงาน
                    </span>
                  </div>

                  {/* Col 3: Single Segmented Bar for New Product & Enhancement */}
                  <div className="col-span-5 flex flex-col gap-1.5 px-3">
                    {/* Unified Multi-Color Segmented Bar */}
                    <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-2xs">
                      {stat.newProductCount > 0 && (
                        <div
                          style={{ width: `${npPct}%` }}
                          className="bg-[#ED1C24] h-full"
                          title={`New Product: ${stat.newProductCount}`}
                        />
                      )}
                      {stat.enhancementCount > 0 && (
                        <div
                          style={{ width: `${enhPct}%` }}
                          className="bg-[#0066CC] h-full"
                          title={`Enhancement: ${stat.enhancementCount}`}
                        />
                      )}
                    </div>
                    {/* Exact Number Indicators */}
                    <div className="flex items-center justify-between text-[11px] font-extrabold">
                      <span className="inline-flex items-center gap-1 text-[#ED1C24]">
                        <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
                        New Product: {stat.newProductCount} ชิ้น
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#0066CC]">
                        <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
                        Enhancement: {stat.enhancementCount} ชิ้น
                      </span>
                    </div>
                  </div>

                  {/* Col 4: Simple Percentage */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-black text-slate-900">
                      {stat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Elegant Bottom Bar / Watermark */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2">
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
