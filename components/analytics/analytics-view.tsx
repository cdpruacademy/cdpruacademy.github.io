"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useTeamMembers } from "@/hooks/use-team-members";
import { DonutChart, DonutChartSegment } from "@/components/ui/donut-chart";
import { TeamManagementModal } from "@/components/dashboard/team-management-modal";
import { AdminLoginModal } from "@/components/auth/admin-login-modal";
import { motion, AnimatePresence } from "motion/react";
import { ProductItem } from "@/lib/timeline-data";
import {
  BarChart3,
  Users,
  Layers,
  GraduationCap,
  Sparkles,
  Filter,
  Package,
  Boxes,
  Lock,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Tag,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

const BROKER_COLORS_KEY = "pru_broker_colors_map_v1";

const DEFAULT_COLORS: Record<string, string> = {
  ttb: "#009FE3",
  "ttb touch": "#009FE3",
  UOB: "#0B2265",
  Agency: "#ED1C24",
  "New Broker": "#334155",
  Audit: "#1E293B",
};

interface AggregatedItem extends ProductItem {
  activeMonths?: string[];
}

export function AnalyticsView() {
  const { isAdmin, login } = useAdminAuth();
  const {
    monthlyStore,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    timelineType,
    setTimelineType,
    isLoaded,
  } = useProducts();

  const {
    teamMembers,
    addMember,
    updateMember,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers();

  // Load custom channel colors from localStorage
  const [colorMap, setColorMap] = useState<Record<string, string>>(DEFAULT_COLORS);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BROKER_COLORS_KEY);
      if (stored) {
        setColorMap({ ...DEFAULT_COLORS, ...JSON.parse(stored) });
      }
    } catch (_) {}
  }, []);

  // Timeframe Scope: Default to "ALL_YEAR" (Annual Overview)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL_YEAR");
  const isAnnual = selectedPeriod === "ALL_YEAR";

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "product" | "enhancement">("all");
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

  // Hover states for Donut charts
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Aggregate Data based on selectedPeriod (Annual vs Single Month)
  const { products, enhancements, monthlyStats } = useMemo(() => {
    if (!monthlyStore) {
      return { products: [], enhancements: [], monthlyStats: [] };
    }

    // Monthly stats for the Trend Bar
    const stats = availableMonths.map((m) => {
      const mData = monthlyStore[m] || { products: [], enhancements: [] };
      const pCount = (mData.products || []).length;
      const eCount = (mData.enhancements || []).length;
      return {
        month: m,
        productsCount: pCount,
        enhancementsCount: eCount,
        totalCount: pCount + eCount,
      };
    });

    // Single Month Scope
    if (!isAnnual) {
      const mData = monthlyStore[selectedPeriod] || { products: [], enhancements: [] };
      const pList: AggregatedItem[] = (mData.products || []).map((p) => ({
        ...p,
        activeMonths: [selectedPeriod],
      }));
      const eList: AggregatedItem[] = (mData.enhancements || []).map((e) => ({
        ...e,
        activeMonths: [selectedPeriod],
      }));
      return {
        products: pList,
        enhancements: eList,
        monthlyStats: stats,
      };
    }

    // Annual Scope: Aggregate all months and deduplicate distinct projects
    const productMap = new Map<string, AggregatedItem>();
    const enhancementMap = new Map<string, AggregatedItem>();

    availableMonths.forEach((m) => {
      const mData = monthlyStore[m];
      if (!mData) return;

      (mData.products || []).forEach((p) => {
        const key = `${p.name.trim().toLowerCase()}___${(p.broker || "").trim().toLowerCase()}`;
        if (!productMap.has(key)) {
          productMap.set(key, { ...p, activeMonths: [m] });
        } else {
          const existing = productMap.get(key)!;
          if (existing.activeMonths && !existing.activeMonths.includes(m)) {
            existing.activeMonths.push(m);
          }
        }
      });

      (mData.enhancements || []).forEach((e) => {
        const key = `${e.name.trim().toLowerCase()}___${(e.broker || "").trim().toLowerCase()}`;
        if (!enhancementMap.has(key)) {
          enhancementMap.set(key, { ...e, activeMonths: [m] });
        } else {
          const existing = enhancementMap.get(key)!;
          if (existing.activeMonths && !existing.activeMonths.includes(m)) {
            existing.activeMonths.push(m);
          }
        }
      });
    });

    return {
      products: Array.from(productMap.values()),
      enhancements: Array.from(enhancementMap.values()),
      monthlyStats: stats,
    };
  }, [monthlyStore, availableMonths, isAnnual, selectedPeriod]);

  // Filtered by type (Product vs Enhancement vs All)
  const activeItems = useMemo(() => {
    if (selectedTypeFilter === "product") return products;
    if (selectedTypeFilter === "enhancement") return enhancements;
    return [...products, ...enhancements];
  }, [products, enhancements, selectedTypeFilter]);

  // Total KPIs
  const totalProjects = products.length + enhancements.length;
  const newProductCount = products.length;
  const enhancementCount = enhancements.length;
  const totalElearning = [...products, ...enhancements].filter((i) =>
    Object.values(i.milestones || {}).some(
      (m) =>
        m?.isElearningIcon ||
        m?.phase === "first-draft-elearning" ||
        m?.phase === "final-elearning"
    )
  ).length;

  // 1. Channel Breakdown Segments (Dynamic with customized colorMap)
  const channelCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeItems.forEach((item) => {
      const ch = item.broker || "Other";
      map[ch] = (map[ch] || 0) + 1;
    });
    return map;
  }, [activeItems]);

  const channelSegments: DonutChartSegment[] = useMemo(() => {
    const entries = Object.entries(channelCounts);
    const palette = ["#009FE3", "#0B2265", "#ED1C24", "#334155", "#8B5CF6", "#10B981", "#F59E0B", "#E11D48"];
    return entries.map(([channel, count], idx) => {
      let color = colorMap[channel];
      if (!color) {
        const lower = channel.toLowerCase();
        if (lower.includes("ttb")) color = colorMap["ttb"] || "#009FE3";
        else if (lower.includes("uob")) color = colorMap["UOB"] || "#0B2265";
        else if (lower.includes("agency")) color = colorMap["Agency"] || "#ED1C24";
        else color = palette[idx % palette.length];
      }
      return {
        label: channel,
        value: count,
        color,
      };
    });
  }, [channelCounts, colorMap]);

  const totalChannelCount = channelSegments.reduce((s, c) => s + c.value, 0);
  const activeHoveredChannel = channelSegments.find((s) => s.label === hoveredChannel);
  const displayChannelVal = activeHoveredChannel?.value ?? totalChannelCount;
  const displayChannelLabel = activeHoveredChannel?.label ?? "ทุกช่องทาง";
  const displayChannelPct =
    totalChannelCount > 0 && activeHoveredChannel
      ? ((activeHoveredChannel.value / totalChannelCount) * 100).toFixed(0)
      : "100";

  // 2. Team Member Workload Breakdown
  const memberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    teamMembers.forEach((m) => {
      map[m] = 0;
    });
    activeItems.forEach((item) => {
      const resp = (item.owner || "").toLowerCase();
      teamMembers.forEach((member) => {
        const shortName = member.split(" ")[0].toLowerCase();
        if (resp.includes(shortName) || resp.includes(member.toLowerCase())) {
          map[member] = (map[member] || 0) + 1;
        }
      });
    });
    return map;
  }, [activeItems, teamMembers]);

  const memberColors = [
    "#ED1C24",
    "#0066CC",
    "#009FE3",
    "#0B2265",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EC4899",
  ];

  const memberSegments: DonutChartSegment[] = useMemo(() => {
    return teamMembers.map((member, idx) => ({
      label: member,
      value: memberCounts[member] || 0,
      color: memberColors[idx % memberColors.length],
    }));
  }, [teamMembers, memberCounts]);

  const totalMemberWorkload = memberSegments.reduce((s, m) => s + m.value, 0);
  const activeHoveredMember = memberSegments.find((s) => s.label === hoveredMember);
  const displayMemberVal = activeHoveredMember?.value ?? totalMemberWorkload;
  const displayMemberLabel = activeHoveredMember?.label ?? "ภาระงานรวม";
  const displayMemberPct =
    totalMemberWorkload > 0 && activeHoveredMember
      ? ((activeHoveredMember.value / totalMemberWorkload) * 100).toFixed(0)
      : "100";

  // Filtered Task list by selected person
  const detailedTasks = useMemo(() => {
    if (!selectedMemberFilter) return activeItems;
    const query = selectedMemberFilter.toLowerCase();
    const shortName = query.split(" ")[0];
    return activeItems.filter((item) => {
      const resp = (item.owner || "").toLowerCase();
      return resp.includes(query) || resp.includes(shortName);
    });
  }, [activeItems, selectedMemberFilter]);

  // If Not Admin, render Security Lock Gate
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#ED1C24] flex items-center justify-center mx-auto shadow-xs border border-red-100">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              พื้นที่เฉพาะผู้ดูแลระบบ (Admin Only)
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              หน้านี้เป็นส่วนสรุปภาพรวมและวิเคราะห์สถิติโครงการของฝ่ายพัฒนาหลักสูตร กรุณาเข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลเพื่อเข้าถึงข้อมูล
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2.5 px-4 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              เข้าสู่ระบบ Admin
            </button>
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl border border-gray-200 transition-all"
            >
              กลับหน้า Product Timeline
            </Link>
          </div>

          <AdminLoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onSuccess={() => setIsLoginModalOpen(false)}
            loginFn={login}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto py-4 px-3 sm:px-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ED1C24] to-[#B3141A] text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
                EXECUTIVE SUMMARY & TEAM ANALYTICS
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                <ShieldCheck className="w-3 h-3" /> Admin Mode
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isAnnual
                ? "วิเคราะห์สถิติ สัดส่วนโครงการ และติดตามภาระงานสะสมตลอดทั้งปีของฝ่ายพัฒนาหลักสูตร"
                : `สรุปสถิติโครงการและภาระงานเฉพาะรอบเดือน ${selectedPeriod}`}
            </p>
          </div>
        </div>

        {/* Controls: Timeframe Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector (Annual or Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#ED1C24]" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL_YEAR">🌟 ภาพรวมทั้งปี (All Year)</option>
              <optgroup label="── เลือกรายเดือน ──">
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    รอบเดือน: {m}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Quick Back to Annual View Button (if single month is active) */}
          {!isAnnual && (
            <button
              type="button"
              onClick={() => setSelectedPeriod("ALL_YEAR")}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#ED1C24] bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors shadow-2xs"
              title="กลับไปดูภาพรวมทั้งปี"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ภาพรวมทั้งปี</span>
            </button>
          )}

          {/* Manage Team Button */}
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-300 shadow-2xs transition-all hover:border-gray-400"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>จัดการสมาชิกทีม ({teamMembers.length})</span>
          </button>

          {/* Link back to Timeline */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ไปหน้า Timeline</span>
          </Link>
        </div>
      </div>

      {/* 2. Four Hero KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Projects */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">
              {isAnnual ? "โครงการสะสม (ทั้งปี)" : `โครงการทั้งหมด (${selectedPeriod})`}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {totalProjects}
            </div>
            <div className="text-[11px] text-gray-400">
              {isAnnual ? "นับตามโครงการที่ไม่ซ้ำ (Unique)" : "ทั้ง New Product & Enhancement"}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-gray-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: New Product */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-red-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#ED1C24]">
              {isAnnual ? "New Product (ทั้งปี)" : "New Product"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#ED1C24] tracking-tight">
              {newProductCount}
            </div>
            <div className="text-[11px] text-red-600/70 font-medium">
              {totalProjects > 0 ? ((newProductCount / totalProjects) * 100).toFixed(0) : 0}% ของงานทั้งหมด
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ED1C24] flex items-center justify-center border border-red-100">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Enhancement */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#0066CC]">
              {isAnnual ? "Enhancement (ทั้งปี)" : "Enhancement"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0066CC] tracking-tight">
              {enhancementCount}
            </div>
            <div className="text-[11px] text-blue-600/70 font-medium">
              {totalProjects > 0 ? ((enhancementCount / totalProjects) * 100).toFixed(0) : 0}% ของงานทั้งหมด
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066CC] flex items-center justify-center border border-blue-100">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: eLearning */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-purple-700">
              {isAnnual ? "มี eLearning (ทั้งปี)" : "มีหลักสูตร eLearning"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">
              {totalElearning}
            </div>
            <div className="text-[11px] text-purple-600/70 font-medium">
              คอร์สอบรมออนไลน์บนระบบ
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Monthly Project Volume Trend Bar (Clickable Bars to Filter Month) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#ED1C24]" />
              <span>แนวโน้มและปริมาณโครงการรายเดือน (Monthly Project Volume)</span>
            </h3>
            <p className="text-xs text-gray-500">
              คลิกที่แท่งของแต่ละเดือนเพื่อเจาะลึกดูสถิติเฉพาะเดือนนั้นๆ ได้ทันที
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#ED1C24]" />
              <span className="text-gray-600">New Product</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0066CC]" />
              <span className="text-gray-600">Enhancement</span>
            </div>
          </div>
        </div>

        {/* Bar Columns Container */}
        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-12 gap-2 pt-2">
          {monthlyStats.map((stat) => {
            const isSelected = selectedPeriod === stat.month;
            const maxVal = Math.max(...monthlyStats.map((s) => s.totalCount), 1);
            const heightPct = Math.round((stat.totalCount / maxVal) * 100);

            return (
              <button
                key={stat.month}
                type="button"
                onClick={() => setSelectedPeriod(stat.month)}
                className={`group flex flex-col items-center p-2 rounded-xl border transition-all text-center cursor-pointer ${
                  isSelected
                    ? "border-[#ED1C24] bg-red-50/50 shadow-xs ring-2 ring-red-400/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-slate-50"
                }`}
                title={`คลิกดูสถิติเดือน ${stat.month} (ทั้งหมด ${stat.totalCount} รายการ)`}
              >
                {/* Total Count Pill */}
                <span
                  className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    stat.totalCount > 0
                      ? isSelected
                        ? "bg-[#ED1C24] text-white"
                        : "bg-slate-100 text-gray-800 group-hover:bg-slate-200"
                      : "text-gray-300"
                  }`}
                >
                  {stat.totalCount}
                </span>

                {/* Vertical Bar Track */}
                <div className="w-6 h-20 bg-slate-100 rounded-lg overflow-hidden flex flex-col justify-end my-1.5 p-0.5">
                  {stat.totalCount > 0 && (
                    <div
                      style={{ height: `${Math.max(heightPct, 18)}%` }}
                      className="w-full flex flex-col justify-end rounded overflow-hidden"
                    >
                      {/* Product segment */}
                      {stat.productsCount > 0 && (
                        <div
                          style={{
                            height: `${(stat.productsCount / stat.totalCount) * 100}%`,
                          }}
                          className="w-full bg-[#ED1C24]"
                          title={`New Product: ${stat.productsCount}`}
                        />
                      )}
                      {/* Enhancement segment */}
                      {stat.enhancementsCount > 0 && (
                        <div
                          style={{
                            height: `${(stat.enhancementsCount / stat.totalCount) * 100}%`,
                          }}
                          className="w-full bg-[#0066CC]"
                          title={`Enhancement: ${stat.enhancementsCount}`}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Month Label */}
                <span
                  className={`text-[10px] font-bold truncate w-full ${
                    isSelected ? "text-[#ED1C24]" : "text-gray-700"
                  }`}
                >
                  {stat.month.split(" ")[0]}
                </span>
                <span className="text-[9px] text-gray-400">
                  {stat.month.split(" ")[1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Scope Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setSelectedTypeFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedTypeFilter === "all"
              ? "bg-white text-gray-900 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ทั้งหมด ({totalProjects})
        </button>
        <button
          type="button"
          onClick={() => setSelectedTypeFilter("product")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedTypeFilter === "product"
              ? "bg-white text-[#ED1C24] shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
          <span>New Product ({newProductCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTypeFilter("enhancement")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedTypeFilter === "enhancement"
              ? "bg-white text-[#0066CC] shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
          <span>Enhancement ({enhancementCount})</span>
        </button>
      </div>

      {/* 5. Two Donut Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Channel / Partner Breakdown */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>
                สัดส่วนโครงการแยกตามช่องทาง {isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              วิเคราะห์ความหนาแน่นของงานในแต่ละพาร์ทเนอร์
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
            <div className="shrink-0">
              <DonutChart
                data={channelSegments}
                size={210}
                strokeWidth={26}
                animationDuration={0.8}
                highlightOnHover={true}
                centerContent={
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={displayChannelLabel}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center justify-center text-center px-1"
                    >
                      <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[110px]">
                        {displayChannelLabel}
                      </span>
                      <span className="text-3xl font-black text-gray-900 leading-tight">
                        {displayChannelVal}
                      </span>
                      {activeHoveredChannel && totalChannelCount > 0 && (
                        <span className="text-xs font-bold text-red-600">
                          {displayChannelPct}%
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                }
              />
            </div>

            <div className="w-full sm:flex-1 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {channelSegments.map((segment) => {
                const isHovered = hoveredChannel === segment.label;
                const pct =
                  totalChannelCount > 0
                    ? ((segment.value / totalChannelCount) * 100).toFixed(0)
                    : "0";
                return (
                  <div
                    key={segment.label}
                    onMouseEnter={() => setHoveredChannel(segment.label)}
                    onMouseLeave={() => setHoveredChannel(null)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isHovered ? "bg-slate-100 shadow-2xs font-bold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate text-gray-800 font-semibold">
                        {segment.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-gray-900">
                        {segment.value}
                      </span>
                      <span className="text-[11px] text-gray-400 w-9 text-right font-medium">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart B: Team Workload Breakdown */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                <span>
                  การกระจายภาระงานรายบุคคล {isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                สัดส่วนจำนวนโครงการที่คนในทีมได้รับมอบหมาย
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
            <div className="shrink-0">
              <DonutChart
                data={memberSegments}
                size={210}
                strokeWidth={26}
                animationDuration={0.8}
                highlightOnHover={true}
                centerContent={
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={displayMemberLabel}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center justify-center text-center px-1"
                    >
                      <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[110px]">
                        {displayMemberLabel}
                      </span>
                      <span className="text-3xl font-black text-gray-900 leading-tight">
                        {displayMemberVal}
                      </span>
                      {activeHoveredMember && totalMemberWorkload > 0 && (
                        <span className="text-xs font-bold text-red-600">
                          {displayMemberPct}%
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                }
              />
            </div>

            <div className="w-full sm:flex-1 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {memberSegments.map((segment) => {
                const isHovered = hoveredMember === segment.label;
                const pct =
                  totalMemberWorkload > 0
                    ? ((segment.value / totalMemberWorkload) * 100).toFixed(0)
                    : "0";
                return (
                  <div
                    key={segment.label}
                    onMouseEnter={() => setHoveredMember(segment.label)}
                    onMouseLeave={() => setHoveredMember(null)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isHovered ? "bg-slate-100 shadow-2xs font-bold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate text-gray-800 font-semibold">
                        {segment.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-gray-900">
                        {segment.value}
                      </span>
                      <span className="text-[11px] text-gray-400 w-9 text-right font-medium">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Detailed Task List Filtered by Responsible Person */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#ED1C24]" />
              <span>
                รายการงานจำแนกตามผู้รับผิดชอบ {isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              คลิกเลือกชื่อคนในทีมเพื่อดูรายการงานทั้งหมดที่รับผิดชอบ
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMemberFilter(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedMemberFilter === null
                  ? "bg-[#ED1C24] text-white shadow-xs"
                  : "bg-slate-50 text-gray-700 border border-gray-200 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด ({activeItems.length})
            </button>

            {teamMembers.map((member) => {
              const count = memberCounts[member] || 0;
              const isSelected = selectedMemberFilter === member;
              return (
                <button
                  key={member}
                  type="button"
                  onClick={() =>
                    setSelectedMemberFilter(isSelected ? null : member)
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#ED1C24] text-white shadow-xs ring-2 ring-red-400/30"
                      : "bg-slate-50 text-gray-700 border border-gray-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{member}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/30 text-white font-black"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Cards Grid */}
        {detailedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            ไม่พบงานที่มอบหมายให้ผู้รับผิดชอบท่านนี้ {isAnnual ? "ตลอดทั้งปี" : `ในรอบเดือน ${selectedPeriod}`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {detailedTasks.map((item) => {
              const brokerColor = colorMap[item.broker] || "#334155";
              const hasElearning = Object.values(item.milestones || {}).some(
                (m) =>
                  m?.isElearningIcon ||
                  m?.phase === "first-draft-elearning" ||
                  m?.phase === "final-elearning"
              );
              return (
                <div
                  key={item.id}
                  style={{ borderLeftColor: brokerColor }}
                  className="bg-slate-50/80 hover:bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/80 border-l-4 shadow-2xs transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        style={{ color: brokerColor }}
                        className="font-bold tracking-tight shrink-0"
                      >
                        [{item.broker}]
                      </span>
                      {/* Active Month Badge in Annual View */}
                      {isAnnual && item.activeMonths && item.activeMonths.length > 0 && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 truncate">
                          {item.activeMonths.join(", ")}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 shrink-0">
                      {item.owner}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-gray-900 line-clamp-2">
                    {item.name}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                    <span className="px-2 py-0.5 bg-white text-gray-600 rounded-md border border-gray-200">
                      Internal: {item.internalDate || "TBC"}
                    </span>
                    <span className="px-2 py-0.5 bg-red-50 text-[#ED1C24] font-bold rounded-md border border-red-200">
                      Launch: {item.commercialDate || item.customRightLabel || "TBC"}
                    </span>
                    {hasElearning && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md border border-purple-200 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> eLearning
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Member Management Modal */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamMembers={teamMembers}
        onAddMember={addMember}
        onUpdateMember={updateMember}
        onDeleteMember={deleteMember}
        onResetToDefault={resetTeamMembers}
      />
    </div>
  );
}
