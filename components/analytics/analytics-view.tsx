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
import { ProductItem, PhaseKey } from "@/lib/timeline-data";
import {
  BarChart3,
  Users,
  Layers,
  GraduationCap,
  Package,
  Boxes,
  Lock,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Tag,
  RotateCcw,
  Search,
  UserCheck,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";

import { resolveBrokerColor } from "@/lib/broker-colors";
import { useChannelColors } from "@/hooks/use-channel-colors";

interface AggregatedItem extends ProductItem {
  activeMonths?: string[];
}

// Helper to check if an item is co-owned (multiple persons assigned)
const isItemCoOwned = (ownerStr?: string) => {
  if (!ownerStr) return false;
  return ownerStr.includes("/") || ownerStr.includes(",") || ownerStr.includes("&");
};

// Helper to match project owner with team member name
const isOwnerMatch = (itemOwner: string | undefined, memberName: string) => {
  if (!itemOwner) return false;
  const lowerOwner = itemOwner.toLowerCase();
  const lowerMember = memberName.toLowerCase();
  const shortName = lowerMember.split(" ")[0]; // e.g. "nitikan" from "Nitikan B."
  return lowerOwner.includes(lowerMember) || lowerOwner.includes(shortName);
};

export function AnalyticsView() {
  const { isAdmin, login } = useAdminAuth();
  const { monthlyStore, availableMonths } = useProducts();

  const {
    teamMembers,
    memberColors,
    addMember,
    updateMember,
    updateMemberColor,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers();

  // Unified Channel Colors from hook (shared with timeline and synchronized)
  const { colorMap } = useChannelColors(monthlyStore);

  // Timeframe Scope: Default to "ALL_YEAR" (Annual Overview)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL_YEAR");
  const isAnnual = selectedPeriod === "ALL_YEAR";

  // Global Member Selector (แบบที่ 1): null means All Team
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Type filter: All vs New Product vs Enhancement
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "product" | "enhancement">("all");

  // Delivery Status Popup Modal State (User Request: เปิดเป็น Popup ไม่ต้องเลื่อนจอ)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<string | null>(null);
  const [modalStatusFilter, setModalStatusFilter] = useState<"pending" | "completed" | "all">("pending");
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Hover states for Donut charts
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // 1. Raw Aggregate Data based on selectedPeriod (Annual vs Single Month)
  const { rawProducts, rawEnhancements } = useMemo(() => {
    if (!monthlyStore) {
      return { rawProducts: [], rawEnhancements: [] };
    }

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
        rawProducts: pList,
        rawEnhancements: eList,
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
      rawProducts: Array.from(productMap.values()),
      rawEnhancements: Array.from(enhancementMap.values()),
    };
  }, [monthlyStore, availableMonths, isAnnual, selectedPeriod]);

  // Total Unique Projects in this scope (Unfiltered by member)
  const rawUniqueProjectsCount = rawProducts.length + rawEnhancements.length;

  // Count co-owned projects
  const coOwnedProjectsCount = useMemo(() => {
    return [...rawProducts, ...rawEnhancements].filter((i) => isItemCoOwned(i.owner)).length;
  }, [rawProducts, rawEnhancements]);

  // 2. Global Filter by selectedMember (แบบที่ 1)
  const products = useMemo(() => {
    if (!selectedMember) return rawProducts;
    return rawProducts.filter((p) => isOwnerMatch(p.owner, selectedMember));
  }, [rawProducts, selectedMember]);

  const enhancements = useMemo(() => {
    if (!selectedMember) return rawEnhancements;
    return rawEnhancements.filter((e) => isOwnerMatch(e.owner, selectedMember));
  }, [rawEnhancements, selectedMember]);

  // Monthly stats for the Trend Bar (also reflects selectedMember)
  const monthlyStats = useMemo(() => {
    if (!monthlyStore) return [];
    return availableMonths.map((m) => {
      const mData = monthlyStore[m] || { products: [], enhancements: [] };
      const pList = selectedMember
        ? (mData.products || []).filter((p) => isOwnerMatch(p.owner, selectedMember))
        : mData.products || [];
      const eList = selectedMember
        ? (mData.enhancements || []).filter((e) => isOwnerMatch(e.owner, selectedMember))
        : mData.enhancements || [];
      return {
        month: m,
        productsCount: pList.length,
        enhancementsCount: eList.length,
        totalCount: pList.length + eList.length,
      };
    });
  }, [monthlyStore, availableMonths, selectedMember]);

  // 3. Filtered by type (Product vs Enhancement vs All)
  const activeItems = useMemo(() => {
    if (selectedTypeFilter === "product") return products;
    if (selectedTypeFilter === "enhancement") return enhancements;
    return [...products, ...enhancements];
  }, [products, enhancements, selectedTypeFilter]);

  // Helper to build status detail for each item
  const buildItemStatus = (item: AggregatedItem) => {
    const launchM = item.milestones?.launch;
    const isCompleted = launchM?.status === "completed";

    let currentPhaseLabel = isCompleted ? "เปิดตัวแล้ว (Launched)" : "รอดำเนินการ";
    if (!isCompleted) {
      const phases: { key: PhaseKey; label: string }[] = [
        { key: "kick-off", label: "Kick-off" },
        { key: "first-draft", label: "First Draft" },
        { key: "first-draft-elearning", label: "First Draft e-Learning" },
        { key: "final-approval", label: "Final Approval" },
        { key: "final-elearning", label: "Final e-Learning" },
        { key: "internal-training", label: "Internal Training" },
        { key: "launch", label: "Launch" },
      ];
      for (const p of phases) {
        const m = item.milestones?.[p.key];
        if (m && m.status !== "completed") {
          currentPhaseLabel = `รอ ${p.label}`;
          break;
        }
      }
    }

    return {
      ...item,
      isCompleted,
      currentPhaseLabel,
      isCoOwned: isItemCoOwned(item.owner),
    };
  };

  // 4. Compute status detail for active items on the page
  const itemsWithStatus = useMemo(() => {
    return activeItems.map(buildItemStatus);
  }, [activeItems]);

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

  // 5. Channel Breakdown Segments
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
    return entries.map(([channel, count]) => {
      const color = resolveBrokerColor(channel, colorMap);
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

  // 6. Team Member Workload Breakdown (Unfiltered by member to calculate team-wide stats)
  const allTeamItemsWithStatus = useMemo(() => {
    const all = [...rawProducts, ...rawEnhancements];
    return all.map(buildItemStatus);
  }, [rawProducts, rawEnhancements]);

  const allTeamPendingCount = useMemo(
    () => allTeamItemsWithStatus.filter((i) => !i.isCompleted).length,
    [allTeamItemsWithStatus]
  );
  const allTeamCompletedCount = useMemo(
    () => allTeamItemsWithStatus.filter((i) => i.isCompleted).length,
    [allTeamItemsWithStatus]
  );

  const memberStats = useMemo(() => {
    const stats: Record<
      string,
      { total: number; completed: number; pending: number; shared: number; solo: number }
    > = {};
    teamMembers.forEach((m) => {
      stats[m] = { total: 0, completed: 0, pending: 0, shared: 0, solo: 0 };
    });

    allTeamItemsWithStatus.forEach((item) => {
      const isCo = isItemCoOwned(item.owner);
      teamMembers.forEach((member) => {
        if (isOwnerMatch(item.owner, member)) {
          stats[member].total += 1;
          if (isCo) stats[member].shared += 1;
          else stats[member].solo += 1;

          if (item.isCompleted) {
            stats[member].completed += 1;
          } else {
            stats[member].pending += 1;
          }
        }
      });
    });
    return stats;
  }, [allTeamItemsWithStatus, teamMembers]);

  // Chart B segments:
  // If selectedMember is null: Show all team workload
  // If selectedMember is chosen: Show that member's completion status (เสร็จ vs ค้าง)
  const memberSegments: DonutChartSegment[] = useMemo(() => {
    if (selectedMember) {
      const mStat = memberStats[selectedMember] || { total: 0, completed: 0, pending: 0 };
      return [
        { label: "เสร็จสมบูรณ์แล้ว", value: mStat.completed, color: "#10B981" },
        { label: "ยังไม่เสร็จ / ค้างอยู่", value: mStat.pending, color: "#F59E0B" },
      ];
    }
    return teamMembers.map((member) => ({
      label: member,
      value: memberStats[member]?.total || 0,
      color: memberColors[member] || "#ED1C24",
    }));
  }, [selectedMember, teamMembers, memberStats, memberColors]);

  const totalMemberWorkload = memberSegments.reduce((s, m) => s + m.value, 0);
  const activeHoveredMember = memberSegments.find((s) => s.label === hoveredMember);
  const displayMemberVal = activeHoveredMember?.value ?? totalMemberWorkload;
  const displayMemberLabel = activeHoveredMember?.label ?? (selectedMember ? "รวมโครงการ" : "ภาระงานที่มอบหมาย");
  const displayMemberPct =
    totalMemberWorkload > 0 && activeHoveredMember
      ? ((activeHoveredMember.value / totalMemberWorkload) * 100).toFixed(0)
      : selectedMember && totalMemberWorkload > 0
      ? `${(((memberStats[selectedMember]?.completed || 0) / totalMemberWorkload) * 100).toFixed(0)}% เสร็จแล้ว`
      : "100";

  // Helper to get owner color
  const getOwnerColor = (ownerName: string | undefined) => {
    if (!ownerName) return "#64748B";
    const matched = teamMembers.find((m) => isOwnerMatch(ownerName, m));
    return matched ? memberColors[matched] || "#ED1C24" : "#64748B";
  };

  // Helper to open Delivery Status Modal for a specific member or all team
  const handleOpenDeliveryModal = (member: string | null) => {
    setModalMember(member === "ALL_TEAM" ? null : member);
    setModalStatusFilter("pending");
    setModalSearchQuery("");
    setIsDeliveryModalOpen(true);
  };

  // 7. Items for the Popup Modal
  const modalItems = useMemo(() => {
    if (!modalMember || modalMember === "ALL_TEAM") {
      return allTeamItemsWithStatus;
    }
    return allTeamItemsWithStatus.filter((i) => isOwnerMatch(i.owner, modalMember));
  }, [allTeamItemsWithStatus, modalMember]);

  const modalPendingItems = useMemo(() => modalItems.filter((i) => !i.isCompleted), [modalItems]);
  const modalCompletedItems = useMemo(() => modalItems.filter((i) => i.isCompleted), [modalItems]);

  const modalDisplayedItems = useMemo(() => {
    let list = modalItems;
    if (modalStatusFilter === "pending") list = modalPendingItems;
    else if (modalStatusFilter === "completed") list = modalCompletedItems;

    if (!modalSearchQuery.trim()) return list;

    const q = modalSearchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.broker || "").toLowerCase().includes(q) ||
        (item.owner || "").toLowerCase().includes(q)
    );
  }, [modalItems, modalStatusFilter, modalPendingItems, modalCompletedItems, modalSearchQuery]);

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
    <div className="w-full max-w-[1440px] mx-auto py-3 px-3 sm:px-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ED1C24] to-[#B3141A] text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-300 shadow-2xs transition-all hover:border-gray-400"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">จัดการสมาชิกทีม</span> ({teamMembers.length})
          </button>

          {/* Link back to Timeline */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Link>
        </div>
      </div>

      {/* 2. Interactive Team Member Selector Bar (แบบที่ 1: Global Filter with Complete Overview) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 flex-wrap">
            <Users className="w-4 h-4 text-[#ED1C24]" />
            <span>เลือกดูสถิติรายบุคคล หรือ ทั้งทีม:</span>
            {selectedMember ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: memberColors[selectedMember] || "#ED1C24" }}
                />
                กำลังดูของ: <span className="text-[#ED1C24] font-black">{selectedMember}</span>
                <span className="text-gray-400 font-normal">|</span>
                <span>รวม {memberStats[selectedMember]?.total || 0} งาน</span>
                <span className="text-amber-700">(ค้าง {memberStats[selectedMember]?.pending || 0})</span>
                <span className="text-emerald-700">(เสร็จ {memberStats[selectedMember]?.completed || 0})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                <span>ภาพรวมทั้งทีม:</span>
                <span className="text-[#ED1C24] font-black">รวม {rawUniqueProjectsCount} โครงการ</span>
                <span className="text-gray-400 font-normal">|</span>
                <span className="text-amber-700 font-bold">ค้าง {allTeamPendingCount}</span>
                <span className="text-emerald-700 font-bold">เสร็จ {allTeamCompletedCount}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Open Popup button */}
            <button
              type="button"
              onClick={() => handleOpenDeliveryModal(selectedMember)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
              title="เปิดหน้าต่าง Popup ติดตามสถานะงานและโครงการที่ค้าง"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูสถานะงาน (Popup)</span>
            </button>

            {selectedMember && (
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#ED1C24] transition-colors ml-1"
                title="กลับไปดูภาพรวมทั้งทีม"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ดูทั้งทีม</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Buttons Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {/* Button: All Team */}
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMember === null
                ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/30"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 ทั้งทีม (All Team)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedMember === null ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {rawUniqueProjectsCount} โครงการ
            </span>
            {allTeamPendingCount > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  selectedMember === null
                    ? "bg-amber-400 text-amber-950 font-black"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                ค้าง {allTeamPendingCount}
              </span>
            )}
          </button>

          {/* Buttons: Each Team Member */}
          {teamMembers.map((member) => {
            const isSelected = selectedMember === member;
            const color = memberColors[member] || "#ED1C24";
            const stat = memberStats[member] || { total: 0, completed: 0, pending: 0, shared: 0 };

            return (
              <button
                key={member}
                type="button"
                onClick={() => setSelectedMember(isSelected ? null : member)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "text-white shadow-sm ring-2 ring-black/20 ring-offset-1"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
                style={isSelected ? { backgroundColor: color } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: isSelected ? "#FFFFFF" : color }}
                />
                <span className="truncate max-w-[130px]">{member}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? "bg-black/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {stat.total}
                </span>
                {stat.pending > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected
                        ? "bg-black/30 text-amber-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    ค้าง {stat.pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Four Hero KPI Summary Cards (Reflects selectedMember) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Projects */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">
              {selectedMember
                ? `โครงการของ ${selectedMember}`
                : isAnnual
                ? "โครงการสะสม (ทั้งปี)"
                : `โครงการทั้งหมด (${selectedPeriod})`}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {totalProjects}
            </div>
            <div className="text-[11px] text-gray-400">
              {selectedMember
                ? "นับโครงการที่ได้รับมอบหมาย"
                : isAnnual
                ? "นับตามโครงการที่ไม่ซ้ำ (Unique)"
                : "ทั้ง New Product & Enhancement"}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-gray-700 flex items-center justify-center shrink-0">
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
            <div className="text-[11px] text-[#ED1C24]/80 font-medium">
              {totalProjects > 0 ? ((newProductCount / totalProjects) * 100).toFixed(0) : 0}% ของงานทั้งหมด
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ED1C24] flex items-center justify-center border border-red-100 shrink-0">
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
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066CC] flex items-center justify-center border border-blue-100 shrink-0">
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
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. Monthly Project Volume Trend Bar (Clickable Bars to Filter Month) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#ED1C24]" />
              <span>
                แนวโน้มและปริมาณโครงการรายเดือน (Monthly Project Volume)
                {selectedMember && <span className="text-[#ED1C24] font-black"> : {selectedMember}</span>}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              {selectedMember
                ? `แสดงจำนวนโครงการของ ${selectedMember} ในแต่ละรอบเดือน (คลิกแท่งเพื่อกรองเฉพาะเดือนนั้น)`
                : "คลิกที่แท่งของแต่ละเดือนเพื่อเจาะลึกดูสถิติเฉพาะเดือนนั้นๆ ได้ทันที"}
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
                    ? "border-[#ED1C24] bg-red-50/50 shadow-xs ring-2 ring-[#ED1C24]/20"
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

      {/* 5. Scope Switcher */}
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

      {/* 6. Two Donut Charts Side-by-Side (Page Finishes Here Cleanly) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Channel / Partner Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>
                สัดส่วนโครงการแยกตามช่องทาง {isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}
                {selectedMember && <span className="text-blue-600 font-bold"> : {selectedMember}</span>}
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
                        <span className="text-xs font-bold text-[#ED1C24]">
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

        {/* Chart B: Team Workload Breakdown with Popup trigger & Co-owner clarity */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ED1C24]" />
                <span>
                  {selectedMember
                    ? `สถานะงานของ ${selectedMember} ${isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}`
                    : `การกระจายภาระงานทั้งทีม ${isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}`}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                {selectedMember
                  ? "สัดส่วนงานที่เสร็จสมบูรณ์แล้ว เทียบกับงานที่ยังค้างอยู่"
                  : `ภาระงานที่มอบหมาย (${totalMemberWorkload} งาน จาก ${rawUniqueProjectsCount} โครงการจริง — มีงานร่วม Co-owner)`}
              </p>
            </div>

            {/* Quick Popup Trigger from Donut Box */}
            <button
              type="button"
              onClick={() => handleOpenDeliveryModal(selectedMember)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#ED1C24] text-xs font-bold rounded-xl border border-red-200 shadow-2xs transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
              title="เปิดหน้าต่าง Popup ติดตามสถานะงานและรายละเอียดโครงการ"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูงาน (Popup)</span>
            </button>
          </div>

          {/* Co-owner Workload Explanation Banner */}
          {!selectedMember && coOwnedProjectsCount > 0 && (
            <div className="flex items-start gap-2 p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>ทำไมยอดรวมถึงเป็น {totalMemberWorkload} ภาระงาน?</strong> เนื่องจากมี {coOwnedProjectsCount} โครงการที่มีผู้รับผิดชอบร่วมกัน 2 คน (Co-owners) จึงทำให้ยอดภาระงานรายบุคคลนับรวมได้ {totalMemberWorkload} งาน จากโครงการจริงทั้งหมด {rawUniqueProjectsCount} โครงการ
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-1">
            <div
              className="shrink-0 cursor-pointer group"
              onClick={() => handleOpenDeliveryModal(selectedMember)}
              title="คลิกเพื่อเปิด Popup รายละเอียดงาน"
            >
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
                      {totalMemberWorkload > 0 && !selectedMember && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          ({rawUniqueProjectsCount} โครงการจริง)
                        </span>
                      )}
                      {selectedMember && totalMemberWorkload > 0 && (
                        <span className="text-xs font-bold text-[#ED1C24]">
                          {displayMemberPct}
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
                const isTeamMember = teamMembers.includes(segment.label);
                const mStat = memberStats[segment.label];

                return (
                  <div
                    key={segment.label}
                    onClick={() => {
                      if (isTeamMember) {
                        handleOpenDeliveryModal(segment.label);
                      }
                    }}
                    onMouseEnter={() => setHoveredMember(segment.label)}
                    onMouseLeave={() => setHoveredMember(null)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isHovered ? "bg-slate-100 shadow-2xs font-bold ring-1 ring-slate-300" : "hover:bg-slate-50"
                    }`}
                    title={isTeamMember ? `คลิกเพื่อเปิด Popup ดูงานของ ${segment.label}` : undefined}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate text-gray-800 font-semibold">
                        {segment.label}
                      </span>
                      {mStat && mStat.shared > 0 && !selectedMember && (
                        <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-bold shrink-0">
                          ร่วม {mStat.shared}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-gray-900">
                        {segment.value}
                      </span>
                      <span className="text-[11px] text-gray-400 w-9 text-right font-medium">
                        {pct}%
                      </span>
                      {isTeamMember && (
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#ED1C24] shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Delivery Status Modal (POPUP WINDOW - REPLACES BOTTOM SECTION) */}
      <AnimatePresence>
        {isDeliveryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeliveryModalOpen(false)}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="shrink-0 p-4 sm:p-5 border-b border-gray-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{
                      backgroundColor:
                        modalMember && modalMember !== "ALL_TEAM"
                          ? memberColors[modalMember] || "#ED1C24"
                          : "#1E293B",
                    }}
                  >
                    {modalMember && modalMember !== "ALL_TEAM" ? (
                      <UserCheck className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                        สถานะการส่งมอบโครงการ :{" "}
                        {modalMember && modalMember !== "ALL_TEAM" ? modalMember : "ทั้งทีม (All Team)"}
                      </h3>
                      <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                        {isAnnual ? "ภาพรวมทั้งปี" : selectedPeriod}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {modalMember && modalMember !== "ALL_TEAM"
                        ? `สรุปโครงการที่มอบหมายให้ ${modalMember} (รวมทั้งหมด ${modalItems.length} โครงการ)`
                        : `สรุปโครงการทั้งหมดของฝ่ายพัฒนาหลักสูตร (รวมทั้งหมด ${modalItems.length} โครงการ)`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors self-end sm:self-auto cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Member Selector Tabs inside Modal */}
              <div className="px-4 sm:px-5 py-2.5 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
                <span className="text-[11px] font-bold text-gray-500 shrink-0 mr-1">สลับดู:</span>
                <button
                  type="button"
                  onClick={() => setModalMember("ALL_TEAM")}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalMember === "ALL_TEAM" || modalMember === null
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  👥 ทั้งทีม ({allTeamItemsWithStatus.length})
                </button>
                {teamMembers.map((member) => {
                  const isSel = modalMember === member;
                  const mColor = memberColors[member] || "#ED1C24";
                  const mStat = memberStats[member] || { total: 0, completed: 0, pending: 0 };
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => setModalMember(member)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? "text-white shadow-2xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                      style={isSel ? { backgroundColor: mColor } : undefined}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: isSel ? "#FFFFFF" : mColor }}
                      />
                      <span>{member}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-full font-black ${
                          isSel ? "bg-black/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {mStat.total}
                      </span>
                      {mStat.pending > 0 && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            isSel ? "bg-black/30 text-amber-200" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          ค้าง {mStat.pending}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* 2 Big Summary Cards inside Modal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Pending */}
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter("pending")}
                    className={`text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      modalStatusFilter === "pending"
                        ? "bg-gradient-to-br from-amber-50 via-white to-orange-50/30 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                        : "bg-white hover:bg-amber-50/20 border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>ยังไม่เสร็จ / ค้างอยู่</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                          {modalPendingItems.length}{" "}
                          <span className="text-xs font-bold text-amber-700">โครงการ</span>
                        </div>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          modalStatusFilter === "pending"
                            ? "bg-amber-500 text-white"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                  </button>

                  {/* Card 2: Completed */}
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter("completed")}
                    className={`text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      modalStatusFilter === "completed"
                        ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs"
                        : "bg-white hover:bg-emerald-50/20 border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>เสร็จสมบูรณ์แล้ว</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                          {modalCompletedItems.length}{" "}
                          <span className="text-xs font-bold text-emerald-700">โครงการ</span>
                        </div>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          modalStatusFilter === "completed"
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                </div>

                {/* Filter and Search Row inside Modal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                        modalStatusFilter === "pending"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : modalStatusFilter === "completed"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {modalStatusFilter === "pending" && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {modalStatusFilter === "completed" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {modalStatusFilter === "all" && <Layers className="w-3.5 h-3.5 text-slate-600" />}
                      <span>
                        {modalStatusFilter === "pending"
                          ? `งานที่ค้างอยู่ (${modalDisplayedItems.length})`
                          : modalStatusFilter === "completed"
                          ? `งานที่เสร็จแล้ว (${modalDisplayedItems.length})`
                          : `งานทั้งหมด (${modalDisplayedItems.length})`}
                      </span>
                    </span>

                    {modalStatusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => setModalStatusFilter("all")}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        ดูทั้งหมด ({modalItems.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalStatusFilter("pending")}
                        className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        เฉพาะงานค้าง ({modalPendingItems.length})
                      </button>
                    )}
                  </div>

                  {/* Search Input inside Modal */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อโครงการ, ช่องทาง..."
                      className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#ED1C24]"
                    />
                  </div>
                </div>

                {/* Visual Cards Grid in Modal (แบบ B) */}
                {modalDisplayedItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-gray-200 space-y-1.5">
                    <div className="text-2xl">
                      {modalStatusFilter === "pending" ? "🎉" : modalStatusFilter === "completed" ? "📦" : "🔍"}
                    </div>
                    <p className="font-bold text-gray-700">
                      {modalStatusFilter === "pending"
                        ? "ไม่มีโครงการที่ค้างอยู่ ทุกรายการเปิดตัวเสร็จสมบูรณ์แล้ว!"
                        : modalStatusFilter === "completed"
                        ? "ยังไม่มีโครงการที่เปิดตัวเสร็จสมบูรณ์ในช่วงเวลานี้"
                        : "ไม่พบโครงการที่ค้นหา"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modalDisplayedItems.map((item) => {
                      const brokerColor = resolveBrokerColor(item.broker, colorMap);
                      const ownerColor = getOwnerColor(item.owner);
                      const isCoOwned = isItemCoOwned(item.owner);
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
                          className="bg-white hover:bg-slate-50/80 p-3.5 rounded-2xl border border-gray-200 border-l-4 shadow-2xs transition-all flex flex-col justify-between space-y-2.5"
                        >
                          {/* Top Row: Channel + Co-owner badge + Phase status */}
                          <div className="flex items-center justify-between gap-1.5 text-[11px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span
                                style={{ color: brokerColor, backgroundColor: `${brokerColor}15` }}
                                className="font-black px-2 py-0.5 rounded-md text-[11px] tracking-tight shrink-0"
                              >
                                {item.broker}
                              </span>
                              {isCoOwned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded shrink-0">
                                  <Users className="w-2.5 h-2.5" /> งานร่วม
                                </span>
                              )}
                              {isAnnual && item.activeMonths && item.activeMonths.length > 0 && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.activeMonths.join(", ")}
                                </span>
                              )}
                            </div>

                            {item.isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> เปิดตัวแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                <Clock className="w-3 h-3 animate-pulse text-amber-600" /> {item.currentPhaseLabel}
                              </span>
                            )}
                          </div>

                          {/* Project Name */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                              {item.name}
                            </h4>
                          </div>

                          {/* Owner & eLearning */}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                style={{ backgroundColor: ownerColor }}
                              />
                              <span className="font-semibold text-gray-700 truncate max-w-[170px]">
                                👤 {item.owner || "ยังไม่ระบุ"}
                              </span>
                            </div>
                            {hasElearning && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded-md border border-purple-200 flex items-center gap-1 text-[9px] shrink-0">
                                <GraduationCap className="w-2.5 h-2.5" /> eLearning
                              </span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-gray-100 text-[10px]">
                            <div className="bg-slate-50 rounded-lg p-1 px-1.5">
                              <span className="text-[9px] text-gray-400 block font-medium">Internal</span>
                              <span className="font-bold text-gray-700 truncate block">
                                {item.internalDate || "TBC"}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg p-1 px-1.5 ${
                                item.isCompleted
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                  : "bg-red-50 text-[#ED1C24] border border-red-100"
                              }`}
                            >
                              <span className="text-[9px] opacity-75 block font-medium">Target Launch</span>
                              <span className="font-bold truncate block">
                                {item.commercialDate || item.customRightLabel || "TBC"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-gray-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">
                  แสดง {modalDisplayedItems.length} จากทั้งหมด {modalItems.length} โครงการ
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Member Management Modal */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamMembers={teamMembers}
        memberColors={memberColors}
        onAddMember={addMember}
        onUpdateMember={updateMember}
        onUpdateMemberColor={updateMemberColor}
        onDeleteMember={deleteMember}
        onResetToDefault={resetTeamMembers}
      />
    </div>
  );
}
