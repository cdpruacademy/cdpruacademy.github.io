"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useProducts } from "@/hooks/use-products"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useTeamMembers } from "@/hooks/use-team-members"
import { DonutChart, DonutChartSegment } from "@/components/ui/donut-chart"
import { TeamManagementModal } from "@/components/dashboard/team-management-modal"
import { AdminLoginModal } from "@/components/auth/admin-login-modal"
import { motion, AnimatePresence } from "motion/react"
import {
  ProductItem,
  PhaseKey,
  getMonthsForYear,
  MONTH_NAMES,
  parseMonthYear,
  getPauseInfo,
  getSystemCurrentMonth,
  compareMonthKeys,
  checkIsProjectCompleted,
} from "@/lib/timeline-data"
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
  Camera,
  Loader2,
  Download,
  Send,
  PauseCircle,
} from "lucide-react"
import Link from "next/link"
import { toPng } from "html-to-image"

import { resolveBrokerColor } from "@/lib/broker-colors"
import { useChannelColors } from "@/hooks/use-channel-colors"
import { updateChannelSummarySnapshot } from "@/lib/supabase"
import { toast } from "@/lib/notify"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"
import { Eyebrow, PruIcon } from "@/components/pru-icon"
import { ChannelSummaryExportBoard } from "./channel-summary-export-board"

interface AggregatedItem extends ProductItem {
  activeMonths?: string[]
}

// Helper to check if an item is co-owned (multiple persons assigned)
const isItemCoOwned = (ownerStr?: string) => {
  if (!ownerStr) return false
  return (
    ownerStr.includes("/") || ownerStr.includes(",") || ownerStr.includes("&")
  )
}

// Helper to match project owner with team member name
const isOwnerMatch = (itemOwner: string | undefined, memberName: string) => {
  if (!itemOwner) return false
  const lowerOwner = itemOwner.toLowerCase()
  const lowerMember = memberName.toLowerCase()
  const shortName = lowerMember.split(" ")[0] // e.g. "nitikan" from "Nitikan B."
  return lowerOwner.includes(lowerMember) || lowerOwner.includes(shortName)
}

// Helper to check if a date string is in the past or current relative to reference month

export function AnalyticsView() {
  const { isAdmin, login } = useAdminAuth()
  const {
    monthlyStore,
    availableMonths,
    getItemsForMonth,
    selectedYear,
    setSelectedYear,
    availableYears,
  } = useProducts()
  const activeYear = selectedYear || new Date().getFullYear()
  const activeYearTh = activeYear + 543
  const yearMonths = useMemo(() => getMonthsForYear(activeYear), [activeYear])

  const {
    teamMembers,
    memberColors,
    addMember,
    updateMember,
    updateMemberColor,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers()

  // Unified Channel Colors from hook (shared with timeline and synchronized)
  const { colorMap } = useChannelColors(monthlyStore)

  // Timeframe Scope: Default to "ALL_YEAR" (Annual Overview)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL_YEAR")
  const isAnnual = selectedPeriod === "ALL_YEAR"

  // Global Member Selector (แบบที่ 1): null means All Team
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  // Type filter: All vs New Product vs Enhancement
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    "all" | "product" | "enhancement"
  >("all")

  // Delivery Status Popup Modal State (User Request: เปิดเป็น Popup ไม่ต้องเลื่อนจอ)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const deliveryDialogRef = useDialogA11y(isDeliveryModalOpen, () =>
    setIsDeliveryModalOpen(false)
  )
  const [modalMember, setModalMember] = useState<string | null>(null)
  const [modalStatusFilter, setModalStatusFilter] = useState<
    "pending" | "completed" | "paused" | "all"
  >("pending")
  const [modalSearchQuery, setModalSearchQuery] = useState("")

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)

  // Dedicated Off-Screen Board for Clean Channel Summary Export
  const [isExporting, setIsExporting] = useState(false)
  const [isSendingLine, setIsSendingLine] = useState(false)
  const channelExportRef = React.useRef<HTMLDivElement>(null)

  const handleExportImage = async () => {
    if (!channelExportRef.current) return
    try {
      setIsExporting(true)
      await new Promise((resolve) => setTimeout(resolve, 150))

      const el = channelExportRef.current
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        width: 1200,
      })

      const safePeriod = isAnnual
        ? `All_Year_${activeYear}`
        : selectedPeriod.replace(/\s+/g, "_")
      const filename = `PRU_CD_Channel_Summary_${safePeriod}.png`

      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export channel summary error:", err)
      toast.error(
        "บันทึกรูปภาพไม่สำเร็จ: " +
          (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleSendToLine = async () => {
    if (!channelExportRef.current) return
    try {
      setIsSendingLine(true)
      await new Promise((resolve) => setTimeout(resolve, 150))

      const el = channelExportRef.current
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        width: 1200,
      })

      const periodLabel = isAnnual
        ? `ภาพรวมทั้งปี ${activeYearTh}`
        : selectedPeriod
      const uploadRes = await updateChannelSummarySnapshot(
        dataUrl,
        periodLabel,
        isAnnual ? `ภาพรวมทั้งปี ${activeYearTh}` : selectedPeriod
      )

      if (!uploadRes.success) {
        throw new Error(uploadRes.error || "ไม่สามารถอัปโหลดภาพได้")
      }

      toast.success(
        `อัปเดตรูปสรุปช่องทาง (${periodLabel}) แล้ว\nพิมพ์ "CD รูป" ในกลุ่ม LINE เพื่อดูรูปนี้`
      )
    } catch (err) {
      console.error("Send channel summary to LINE error:", err)
      toast.error(
        "ส่งรูปเข้า LINE ไม่สำเร็จ: " +
          (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setIsSendingLine(false)
    }
  }

  // Hover states for Donut charts
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null)
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)

  // 1. Raw Aggregate Data based on selectedPeriod (Annual vs Single Month)
  const { rawProducts, rawEnhancements } = useMemo(() => {
    if (!monthlyStore) {
      return { rawProducts: [], rawEnhancements: [] }
    }

    // Single Month Scope
    if (!isAnnual) {
      const pItems = getItemsForMonth
        ? getItemsForMonth(selectedPeriod, "product")
        : monthlyStore[selectedPeriod]?.products || []
      const eItems = getItemsForMonth
        ? getItemsForMonth(selectedPeriod, "enhancement")
        : monthlyStore[selectedPeriod]?.enhancements || []
      const pList: AggregatedItem[] = pItems.map((p) => ({
        ...p,
        activeMonths: [selectedPeriod],
      }))
      const eList: AggregatedItem[] = eItems.map((e) => ({
        ...e,
        activeMonths: [selectedPeriod],
      }))
      return {
        rawProducts: pList,
        rawEnhancements: eList,
      }
    }

    // Annual Scope: Aggregate all months of activeYear and deduplicate distinct projects
    // Taking the latest month's progress and merging completed milestones chronologically
    const productMap = new Map<string, AggregatedItem>()
    const enhancementMap = new Map<string, AggregatedItem>()

    const mergeItem = (
      map: Map<string, AggregatedItem>,
      item: ProductItem,
      month: string
    ) => {
      const key = `${item.name.trim().toLowerCase()}___${(item.broker || "").trim().toLowerCase()}`
      if (!map.has(key)) {
        map.set(key, { ...item, activeMonths: [month] })
      } else {
        const existing = map.get(key)!
        const months = existing.activeMonths || []
        if (!months.includes(month)) {
          months.push(month)
        }

        // Merge milestones so that any completed milestone in any month is retained
        const mergedMilestones = {
          ...(existing.milestones || {}),
          ...(item.milestones || {}),
        }
        Object.entries(existing.milestones || {}).forEach(([mKey, mVal]) => {
          if (
            mVal?.status === "completed" &&
            (!mergedMilestones[mKey as PhaseKey] ||
              mergedMilestones[mKey as PhaseKey]?.status !== "completed")
          ) {
            mergedMilestones[mKey as PhaseKey] = mVal
          }
        })

        // The iteration runs chronologically (JAN -> DEC), so the latest month's dates, labels, and owner take precedence
        map.set(key, {
          ...existing,
          ...item,
          milestones: mergedMilestones,
          activeMonths: months,
        })
      }
    }

    yearMonths.forEach((m) => {
      const mData = monthlyStore[m]
      if (!mData) return

      ;(mData.products || []).forEach(
        (p) => !p.isDeleted && mergeItem(productMap, p, m)
      )
      ;(mData.enhancements || []).forEach(
        (e) => !e.isDeleted && mergeItem(enhancementMap, e, m)
      )
    })

    // Latest status of the year: as of December, or this month for the current year
    const lastMonthOfYear = yearMonths[yearMonths.length - 1]
    const currentMonth = getSystemCurrentMonth()
    const statusMonth =
      compareMonthKeys(currentMonth, lastMonthOfYear) < 0
        ? currentMonth
        : lastMonthOfYear
    const withPause = (item: AggregatedItem): AggregatedItem => {
      const info = getPauseInfo(monthlyStore, item.id, statusMonth)
      return info.paused
        ? { ...item, isPaused: true, pausedSince: info.since }
        : { ...item, isPaused: false, pausedSince: undefined }
    }

    return {
      rawProducts: Array.from(productMap.values()).map(withPause),
      rawEnhancements: Array.from(enhancementMap.values()).map(withPause),
    }
  }, [monthlyStore, yearMonths, isAnnual, selectedPeriod])

  // Total Unique Projects in this scope (Unfiltered by member)
  const rawUniqueProjectsCount = rawProducts.length + rawEnhancements.length

  // Count co-owned projects
  const coOwnedProjectsCount = useMemo(() => {
    return [...rawProducts, ...rawEnhancements].filter((i) =>
      isItemCoOwned(i.owner)
    ).length
  }, [rawProducts, rawEnhancements])

  // 2. Global Filter by selectedMember (แบบที่ 1)
  const products = useMemo(() => {
    if (!selectedMember) return rawProducts
    return rawProducts.filter((p) => isOwnerMatch(p.owner, selectedMember))
  }, [rawProducts, selectedMember])

  const enhancements = useMemo(() => {
    if (!selectedMember) return rawEnhancements
    return rawEnhancements.filter((e) => isOwnerMatch(e.owner, selectedMember))
  }, [rawEnhancements, selectedMember])

  // Monthly stats for the Trend Bar (strictly 12 months of activeYear, reflects selectedMember and includes cross-month carryovers)
  const monthlyStats = useMemo(() => {
    if (!monthlyStore) return []
    return yearMonths.map((m) => {
      const pItems = getItemsForMonth
        ? getItemsForMonth(m, "product")
        : monthlyStore[m]?.products || []
      const eItems = getItemsForMonth
        ? getItemsForMonth(m, "enhancement")
        : monthlyStore[m]?.enhancements || []

      const pList = selectedMember
        ? pItems.filter((p) => isOwnerMatch(p.owner, selectedMember))
        : pItems
      const eList = selectedMember
        ? eItems.filter((e) => isOwnerMatch(e.owner, selectedMember))
        : eItems

      const pausedCount = [...pList, ...eList].filter((i) => i.isPaused).length
      const productsCount = pList.filter((i) => !i.isPaused).length
      const enhancementsCount = eList.filter((i) => !i.isPaused).length
      return {
        month: m,
        productsCount,
        enhancementsCount,
        pausedCount,
        totalCount: productsCount + enhancementsCount + pausedCount,
      }
    })
  }, [monthlyStore, yearMonths, selectedMember, getItemsForMonth])

  // 3. Filtered by type (Product vs Enhancement vs All)
  const activeItems = useMemo(() => {
    if (selectedTypeFilter === "product") return products
    if (selectedTypeFilter === "enhancement") return enhancements
    return [...products, ...enhancements]
  }, [products, enhancements, selectedTypeFilter])

  // Helper to build status detail for each item
  const buildItemStatus = (item: AggregatedItem) => {
    const isCompleted = checkIsProjectCompleted(item, selectedPeriod)
    const isPaused = !isCompleted && Boolean(item.isPaused)

    let currentPhaseLabel = isCompleted
      ? "เปิดตัวแล้ว (Launched)"
      : "รอดำเนินการ"
    if (isPaused) {
      currentPhaseLabel = item.pausedSince
        ? `หยุดชั่วคราวตั้งแต่ ${item.pausedSince}`
        : "หยุดชั่วคราว"
    } else if (!isCompleted) {
      const phases: { key: PhaseKey; label: string }[] = [
        { key: "kick-off", label: "Kick-off" },
        { key: "first-draft", label: "First Draft" },
        { key: "first-draft-elearning", label: "First Draft e-Learning" },
        { key: "final-approval", label: "Final Approval" },
        { key: "final-elearning", label: "Final e-Learning" },
        { key: "internal-training", label: "Internal Training" },
      ]
      let foundPending = false
      for (const p of phases) {
        const m = item.milestones?.[p.key]
        if (m && m.status !== "completed") {
          currentPhaseLabel = `รอ ${p.label.replace("\n", " ")}`
          foundPending = true
          break
        }
      }

      if (!foundPending) {
        if (item.milestones?.["internal-training"]?.status === "completed") {
          currentPhaseLabel = item.commercialDate
            ? `รอ Target Launch (${item.commercialDate})`
            : "รอ Target Launch"
        } else if (
          item.milestones?.["final-approval"]?.status === "completed"
        ) {
          currentPhaseLabel = "รอ Internal Training"
        } else if (item.milestones?.["first-draft"]?.status === "completed") {
          currentPhaseLabel = "รอ Final Approval"
        } else if (item.milestones?.["kick-off"]?.status === "completed") {
          currentPhaseLabel = "รอ First Draft"
        } else {
          currentPhaseLabel = "รอ Kick-off"
        }
      }
    }

    return {
      ...item,
      isCompleted,
      isPaused,
      currentPhaseLabel,
      isCoOwned: isItemCoOwned(item.owner),
    }
  }

  // 4. Compute status detail for active items on the page
  const itemsWithStatus = useMemo(() => {
    return activeItems.map(buildItemStatus)
  }, [activeItems])

  // Total KPIs (paused projects still count: the team did work on them this year)
  const totalProjects = products.length + enhancements.length
  const pausedProjectsCount = itemsWithStatus.filter((i) => i.isPaused).length
  const newProductCount = products.length
  const enhancementCount = enhancements.length
  const totalElearning = [...products, ...enhancements].filter((i) =>
    Boolean(
      i.milestones?.["first-draft-elearning"] ||
      i.milestones?.["final-elearning"]
    )
  ).length

  // 5. Channel Breakdown Segments
  const channelCounts = useMemo(() => {
    const map: Record<string, number> = {}
    activeItems.forEach((item) => {
      const ch = item.broker || "Other"
      map[ch] = (map[ch] || 0) + 1
    })
    return map
  }, [activeItems])

  const channelSegments: DonutChartSegment[] = useMemo(() => {
    const entries = Object.entries(channelCounts)
    return entries.map(([channel, count]) => {
      const color = resolveBrokerColor(channel, colorMap)
      return {
        label: channel,
        value: count,
        color,
      }
    })
  }, [channelCounts, colorMap])

  const totalChannelCount = channelSegments.reduce((s, c) => s + c.value, 0)
  const activeHoveredChannel = channelSegments.find(
    (s) => s.label === hoveredChannel
  )
  const displayChannelVal = activeHoveredChannel?.value ?? totalChannelCount
  const displayChannelLabel = activeHoveredChannel?.label ?? "ทุกช่องทาง"
  const displayChannelPct =
    totalChannelCount > 0 && activeHoveredChannel
      ? ((activeHoveredChannel.value / totalChannelCount) * 100).toFixed(0)
      : "100"

  // 6. Team Member Workload Breakdown (Unfiltered by member to calculate team-wide stats)
  const allTeamItemsWithStatus = useMemo(() => {
    const all = [...rawProducts, ...rawEnhancements]
    return all.map(buildItemStatus)
  }, [rawProducts, rawEnhancements])

  const allTeamPendingCount = useMemo(
    () =>
      allTeamItemsWithStatus.filter((i) => !i.isCompleted && !i.isPaused)
        .length,
    [allTeamItemsWithStatus]
  )
  const allTeamPausedCount = useMemo(
    () => allTeamItemsWithStatus.filter((i) => i.isPaused).length,
    [allTeamItemsWithStatus]
  )
  const allTeamCompletedCount = useMemo(
    () => allTeamItemsWithStatus.filter((i) => i.isCompleted).length,
    [allTeamItemsWithStatus]
  )

  const memberStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number
        completed: number
        pending: number
        paused: number
        shared: number
        solo: number
      }
    > = {}
    teamMembers.forEach((m) => {
      stats[m] = {
        total: 0,
        completed: 0,
        pending: 0,
        paused: 0,
        shared: 0,
        solo: 0,
      }
    })

    allTeamItemsWithStatus.forEach((item) => {
      const isCo = isItemCoOwned(item.owner)
      teamMembers.forEach((member) => {
        if (isOwnerMatch(item.owner, member)) {
          stats[member].total += 1
          if (isCo) stats[member].shared += 1
          else stats[member].solo += 1

          if (item.isCompleted) {
            stats[member].completed += 1
          } else if (item.isPaused) {
            stats[member].paused += 1
          } else {
            stats[member].pending += 1
          }
        }
      })
    })
    return stats
  }, [allTeamItemsWithStatus, teamMembers])

  // Chart B segments:
  // If selectedMember is null: Show all team workload
  // If selectedMember is chosen: Show that member's completion status (เสร็จ vs ค้าง)
  const memberSegments: DonutChartSegment[] = useMemo(() => {
    if (selectedMember) {
      const mStat = memberStats[selectedMember] || {
        total: 0,
        completed: 0,
        pending: 0,
        paused: 0,
      }
      return [
        { label: "เสร็จสมบูรณ์แล้ว", value: mStat.completed, color: "#10B981" },
        {
          label: "ยังไม่เสร็จ / ค้างอยู่",
          value: mStat.pending,
          color: "#F59E0B",
        },
        ...(mStat.paused > 0
          ? [{ label: "หยุดชั่วคราว", value: mStat.paused, color: "#94A3B8" }]
          : []),
      ]
    }
    return teamMembers.map((member) => ({
      label: member,
      value: memberStats[member]?.total || 0,
      color: memberColors[member] || "#ED1C24",
    }))
  }, [selectedMember, teamMembers, memberStats, memberColors])

  const totalMemberWorkload = memberSegments.reduce((s, m) => s + m.value, 0)
  const activeHoveredMember = memberSegments.find(
    (s) => s.label === hoveredMember
  )
  const displayMemberVal = activeHoveredMember?.value ?? totalMemberWorkload
  const displayMemberLabel =
    activeHoveredMember?.label ??
    (selectedMember ? "รวมโครงการ" : "ภาระงานที่มอบหมาย")
  const displayMemberPct =
    totalMemberWorkload > 0 && activeHoveredMember
      ? ((activeHoveredMember.value / totalMemberWorkload) * 100).toFixed(0)
      : selectedMember && totalMemberWorkload > 0
        ? `${(((memberStats[selectedMember]?.completed || 0) / totalMemberWorkload) * 100).toFixed(0)}% เสร็จแล้ว`
        : "100"

  // Helper to get owner color
  const getOwnerColor = (ownerName: string | undefined) => {
    if (!ownerName) return "#64748B"
    const matched = teamMembers.find((m) => isOwnerMatch(ownerName, m))
    return matched ? memberColors[matched] || "#ED1C24" : "#64748B"
  }

  // Helper to open Delivery Status Modal for a specific member or all team
  const handleOpenDeliveryModal = (member: string | null) => {
    setModalMember(member === "ALL_TEAM" ? null : member)
    setModalStatusFilter("pending")
    setModalSearchQuery("")
    setIsDeliveryModalOpen(true)
  }

  // 7. Items for the Popup Modal
  const modalItems = useMemo(() => {
    if (!modalMember || modalMember === "ALL_TEAM") {
      return allTeamItemsWithStatus
    }
    return allTeamItemsWithStatus.filter((i) =>
      isOwnerMatch(i.owner, modalMember)
    )
  }, [allTeamItemsWithStatus, modalMember])

  const modalPendingItems = useMemo(
    () => modalItems.filter((i) => !i.isCompleted && !i.isPaused),
    [modalItems]
  )
  const modalCompletedItems = useMemo(
    () => modalItems.filter((i) => i.isCompleted),
    [modalItems]
  )
  const modalPausedItems = useMemo(
    () => modalItems.filter((i) => i.isPaused),
    [modalItems]
  )

  const modalDisplayedItems = useMemo(() => {
    let list = modalItems
    if (modalStatusFilter === "pending") list = modalPendingItems
    else if (modalStatusFilter === "completed") list = modalCompletedItems
    else if (modalStatusFilter === "paused") list = modalPausedItems

    if (!modalSearchQuery.trim()) return list

    const q = modalSearchQuery.toLowerCase()
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.broker || "").toLowerCase().includes(q) ||
        (item.owner || "").toLowerCase().includes(q)
    )
  }, [
    modalItems,
    modalStatusFilter,
    modalPendingItems,
    modalCompletedItems,
    modalPausedItems,
    modalSearchQuery,
  ])

  // If Not Admin, render Security Lock Gate
  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-brand-ink shadow-xs">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black tracking-tight text-gray-900">
              พื้นที่เฉพาะผู้ดูแลระบบ (Admin Only)
            </h2>
            <p className="text-xs leading-relaxed text-gray-500">
              หน้านี้เป็นส่วนสรุปภาพรวมและวิเคราะห์สถิติโครงการของฝ่ายพัฒนาหลักสูตร
              กรุณาเข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลเพื่อเข้าถึงข้อมูล
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full rounded-xl bg-brand-fill px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-hover"
            >
              เข้าสู่ระบบ Admin
            </button>
            <Link
              href="/"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100"
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
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      {/* 1. Header: the headline states the conclusion */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-3">
          <Eyebrow>
            สรุปสถิติ · {isAnnual ? `ทั้งปี ${activeYearTh}` : selectedPeriod}
          </Eyebrow>
          <h1 className="m-0 text-[28px] leading-tight font-bold text-ink sm:text-[40px]">
            ส่งมอบแล้ว{" "}
            <span className="text-pru-red">{allTeamCompletedCount}</span> จาก{" "}
            {rawUniqueProjectsCount} โครงการ
          </h1>
          <p className="m-0 text-sm text-ink-soft">
            ยังดำเนินการอยู่ {allTeamPendingCount} โครงการ
            {allTeamPausedCount > 0
              ? ` · หยุดชั่วคราว ${allTeamPausedCount}`
              : ""}
            {isAnnual
              ? " · นับโครงการไม่ซ้ำข้ามเดือน"
              : ` · เฉพาะรอบเดือน ${selectedPeriod}`}
          </p>
        </div>

        {/* Controls: Timeframe Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Switcher for Analytics */}
          {availableYears && availableYears.length > 0 && setSelectedYear ? (
            <div className="flex h-11 items-center gap-2 border-2 border-rule bg-white px-3">
              <span className="text-sm text-ink-soft">ปี</span>
              <select
                value={activeYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value, 10)
                  setSelectedYear(newYear)
                  setSelectedPeriod("ALL_YEAR")
                }}
                className="cursor-pointer bg-transparent text-sm font-bold text-ink focus:outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y + 543} ({y})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Timeframe Selector (Annual or Monthly) */}
          <div className="flex h-11 items-center gap-2 border-2 border-rule bg-white px-3">
            <PruIcon name="calendar" size={18} className="text-pru-red" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-bold text-ink focus:outline-none"
            >
              <option value="ALL_YEAR">
                ภาพรวมทั้งปี {activeYearTh} (All Year {activeYear})
              </option>
              <optgroup label={`── เลือกรายเดือนปี ${activeYearTh} ──`}>
                {yearMonths.map((m) => (
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
              className="export-hide inline-flex h-11 touch-target cursor-pointer items-center gap-2 border-2 border-rule bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-50"
              title="กลับไปดูภาพรวมทั้งปี"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>ภาพรวมทั้งปี</span>
            </button>
          )}

          {/* Manage Team Button */}
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="export-hide inline-flex h-11 touch-target cursor-pointer items-center gap-2 border-2 border-rule bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            <PruIcon name="family" size={18} />
            <span className="hidden sm:inline">จัดการสมาชิกทีม</span> (
            {teamMembers.length})
          </button>

          {/* Send to LINE Button */}
          <button
            type="button"
            onClick={handleSendToLine}
            disabled={isSendingLine}
            className="export-hide inline-flex h-11 touch-target cursor-pointer items-center gap-2 border-2 border-rule bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-50"
            title="อัปเดตรูปภาพสรุปช่องทางหน้านี้ขึ้น Cloud เพื่อให้ LINE Bot นำไปส่ง"
          >
            {isSendingLine ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PruIcon name="send" size={18} />
            )}
            <span>{isSendingLine ? "กำลังส่ง..." : "ส่งรูปเข้า LINE"}</span>
          </button>

          {/* Export to Image Button */}
          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="export-hide inline-flex h-11 touch-target cursor-pointer items-center gap-2 border-2 border-brand-fill bg-brand-fill px-4 text-sm font-bold text-white transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:opacity-50"
            title="บันทึกหน้าสรุปสถิตินี้เป็นรูปภาพความละเอียดสูง (2K)"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PruIcon name="document" size={18} />
            )}
            <span>
              {isExporting ? "กำลังบันทึกภาพ..." : "บันทึกเป็นรูปภาพ"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Team Member Selector Bar (แบบที่ 1: Global Filter with Complete Overview) */}
      <div className="space-y-3 border-2 border-rule bg-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-800">
            <Users className="h-4 w-4 text-brand-ink" />
            <span>เลือกดูสถิติรายบุคคล หรือ ทั้งทีม:</span>
            {selectedMember ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: memberColors[selectedMember] || "#ED1C24",
                  }}
                />
                กำลังดูของ:{" "}
                <span className="font-black text-brand-ink">
                  {selectedMember}
                </span>
                <span className="font-normal text-gray-500">|</span>
                <span>รวม {memberStats[selectedMember]?.total || 0} งาน</span>
                <span className="text-amber-700">
                  (ค้าง {memberStats[selectedMember]?.pending || 0})
                </span>
                <span className="text-emerald-700">
                  (เสร็จ {memberStats[selectedMember]?.completed || 0})
                </span>
                {(memberStats[selectedMember]?.paused || 0) > 0 && (
                  <span className="text-slate-500">
                    (หยุดชั่วคราว {memberStats[selectedMember]?.paused})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                <span>ภาพรวมทั้งทีม:</span>
                <span className="font-black text-brand-ink">
                  รวม {rawUniqueProjectsCount} โครงการ
                </span>
                <span className="font-normal text-gray-500">|</span>
                <span className="font-bold text-amber-700">
                  ค้าง {allTeamPendingCount}
                </span>
                <span className="font-bold text-emerald-700">
                  เสร็จ {allTeamCompletedCount}
                </span>
                {allTeamPausedCount > 0 && (
                  <span className="font-bold text-slate-500">
                    หยุดชั่วคราว {allTeamPausedCount}
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Open Popup button */}
            <button
              type="button"
              onClick={() => handleOpenDeliveryModal(selectedMember)}
              className="export-hide inline-flex h-11 touch-target cursor-pointer items-center gap-2 border-2 border-rule bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-50"
              title="เปิดหน้าต่าง Popup ติดตามสถานะงานและโครงการที่ค้าง"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>เปิดดูสถานะงาน (Popup)</span>
            </button>

            {selectedMember && (
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-gray-500 transition-colors hover:text-brand-ink"
                title="กลับไปดูภาพรวมทั้งทีม"
              >
                <RotateCcw className="h-3 w-3" />
                <span>ดูทั้งทีม</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Buttons Row */}
        <div className="flex scrollbar-thin items-center gap-2 overflow-x-auto pt-0.5 pb-1.5">
          {/* Button: All Team */}
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              selectedMember === null
                ? "bg-ink text-white"
                : "border-2 border-rule bg-white text-ink hover:bg-surface"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>ทั้งทีม</span>
            <span
              className={`py-0.2 rounded-full px-1.5 text-xs font-black ${
                selectedMember === null
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {rawUniqueProjectsCount} โครงการ
            </span>
            {allTeamPendingCount > 0 && (
              <span
                className={`py-0.2 rounded px-1.5 text-xs font-semibold ${
                  selectedMember === null
                    ? "bg-pru-red font-bold text-white"
                    : "border border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                ค้าง {allTeamPendingCount}
              </span>
            )}
          </button>

          {/* Buttons: Each Team Member */}
          {teamMembers.map((member) => {
            const isSelected = selectedMember === member
            const color = memberColors[member] || "#ED1C24"
            const stat = memberStats[member] || {
              total: 0,
              completed: 0,
              pending: 0,
              shared: 0,
            }

            return (
              <button
                key={member}
                type="button"
                onClick={() => setSelectedMember(isSelected ? null : member)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "text-white"
                    : "border-2 border-rule bg-white text-ink hover:bg-surface"
                }`}
                style={isSelected ? { backgroundColor: color } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: isSelected ? "#FFFFFF" : color }}
                />
                <span className="max-w-[130px] truncate">{member}</span>
                <span
                  className={`py-0.2 rounded-full px-1.5 text-xs font-black ${
                    isSelected
                      ? "bg-black/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {stat.total}
                </span>
                {stat.pending > 0 && (
                  <span
                    className={`py-0.2 rounded px-1.5 text-xs font-semibold ${
                      isSelected
                        ? "bg-black/30 text-amber-200"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    ค้าง {stat.pending}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Four Hero KPI Summary Cards (Reflects selectedMember) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Projects */}
        <div className="relative flex items-center justify-between bg-pru-red p-5 text-white sm:p-6">
          <div className="space-y-1 pr-12 sm:pr-14">
            <span className="text-lg font-bold sm:text-2xl">
              {selectedMember
                ? `โครงการของ ${selectedMember}`
                : isAnnual
                  ? "โครงการสะสม (ทั้งปี)"
                  : `โครงการทั้งหมด (${selectedPeriod})`}
            </span>
            <div className="text-[56px] leading-none font-bold sm:text-[72px]">
              {totalProjects}
            </div>
            {pausedProjectsCount > 0 && (
              <div className="text-lg font-bold">
                หยุดชั่วคราว {pausedProjectsCount}
              </div>
            )}
            <div className="sr-only">
              {selectedMember
                ? "นับโครงการที่ได้รับมอบหมาย"
                : isAnnual
                  ? "นับตามโครงการที่ไม่ซ้ำ (Unique)"
                  : "ทั้ง New Product & Enhancement"}
            </div>
          </div>
          <PruIcon
            name="document"
            size={48}
            strokeWidth={3}
            className="absolute top-5 right-4 h-9 w-9 opacity-90 sm:right-5 sm:h-12 sm:w-12"
          />
        </div>

        {/* Card 2: New Product */}
        <div className="flex items-center justify-between border-2 border-rule bg-white p-4 sm:p-5">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-brand-ink">
              {isAnnual ? "New Product (ทั้งปี)" : "New Product"}
            </span>
            <div className="text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
              {newProductCount}
            </div>
            <div className="text-xs font-medium text-brand-ink">
              {totalProjects > 0
                ? ((newProductCount / totalProjects) * 100).toFixed(0)
                : 0}
              % ของงานทั้งหมด
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-brand-ink">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Enhancement */}
        <div className="flex items-center justify-between border-2 border-rule bg-white p-4 sm:p-5">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-enhancement">
              {isAnnual ? "Enhancement (ทั้งปี)" : "Enhancement"}
            </span>
            <div className="text-2xl font-black tracking-tight text-enhancement sm:text-3xl">
              {enhancementCount}
            </div>
            <div className="text-xs font-medium text-slate-700">
              {totalProjects > 0
                ? ((enhancementCount / totalProjects) * 100).toFixed(0)
                : 0}
              % ของงานทั้งหมด
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-enhancement">
            <Boxes className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: eLearning */}
        <div className="flex items-center justify-between border-2 border-rule bg-white p-4 sm:p-5">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">
              {isAnnual ? "มี eLearning (ทั้งปี)" : "มีหลักสูตร eLearning"}
            </span>
            <div className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {totalElearning}
            </div>
            <div className="text-xs font-medium text-slate-700">
              คอร์สอบรมออนไลน์บนระบบ
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 4. Monthly Project Volume Trend Bar (Clickable Bars to Filter Month) */}
      <div className="space-y-4 border-2 border-rule bg-white p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
              <BarChart3 className="h-4 w-4 text-brand-ink" />
              <span>
                แนวโน้มและปริมาณโครงการรายเดือน (Monthly Project Volume)
                {selectedMember && (
                  <span className="font-black text-brand-ink">
                    {" "}
                    : {selectedMember}
                  </span>
                )}
              </span>
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-brand-ink">
                ปี {activeYearTh} ({activeYear})
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              {selectedMember
                ? `แสดงจำนวนโครงการของ ${selectedMember} ในแต่ละรอบเดือนของปี ${activeYearTh} (คลิกแท่งเพื่อกรองเฉพาะเดือนนั้น)`
                : `แสดงจำนวนโครงการทั้ง 12 เดือนของปี ${activeYearTh} (คลิกที่แท่งของแต่ละเดือนเพื่อเจาะลึกดูสถิติได้ทันที)`}
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-pru-red" />
              <span className="text-gray-600">New Product</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-enhancement" />
              <span className="text-gray-600">Enhancement</span>
            </div>
          </div>
        </div>

        {/* Bar Columns Container (Strictly 12 Months of the Selected Year) */}
        <div className="grid grid-cols-4 gap-2 pt-2 sm:grid-cols-6 lg:grid-cols-12">
          {monthlyStats.map((stat) => {
            const isSelected = selectedPeriod === stat.month
            const maxVal = Math.max(...monthlyStats.map((s) => s.totalCount), 1)
            const heightPct = Math.round((stat.totalCount / maxVal) * 100)

            return (
              <button
                key={stat.month}
                type="button"
                onClick={() => setSelectedPeriod(stat.month)}
                className={`group flex cursor-pointer flex-col items-center rounded-xl border p-2 text-center transition-all ${
                  isSelected
                    ? "border-[#ED1C24] bg-red-50/50 shadow-xs ring-2 ring-brand/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-slate-50"
                }`}
                title={`คลิกดูสถิติเดือน ${stat.month} (ทั้งหมด ${stat.totalCount} รายการ)`}
              >
                {/* Total Count Pill */}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-black ${
                    stat.totalCount > 0
                      ? isSelected
                        ? "bg-brand-fill text-white"
                        : "bg-slate-100 text-gray-800 group-hover:bg-slate-200"
                      : "text-gray-300"
                  }`}
                >
                  {stat.totalCount}
                </span>

                {/* Vertical Bar Track */}
                <div className="my-1.5 flex h-20 w-6 flex-col justify-end overflow-hidden rounded-lg bg-slate-100 p-0.5">
                  {stat.totalCount > 0 && (
                    <div
                      style={{ height: `${Math.max(heightPct, 18)}%` }}
                      className="flex w-full flex-col justify-end overflow-hidden rounded"
                    >
                      {/* Product segment */}
                      {stat.productsCount > 0 && (
                        <div
                          style={{
                            height: `${(stat.productsCount / stat.totalCount) * 100}%`,
                          }}
                          className="w-full bg-pru-red"
                          title={`New Product: ${stat.productsCount}`}
                        />
                      )}
                      {/* Enhancement segment */}
                      {stat.enhancementsCount > 0 && (
                        <div
                          style={{
                            height: `${(stat.enhancementsCount / stat.totalCount) * 100}%`,
                          }}
                          className="w-full bg-enhancement"
                          title={`Enhancement: ${stat.enhancementsCount}`}
                        />
                      )}
                      {/* Paused this month */}
                      {stat.pausedCount > 0 && (
                        <div
                          style={{
                            height: `${(stat.pausedCount / stat.totalCount) * 100}%`,
                          }}
                          className="w-full bg-[#94A3B8]"
                          title={`หยุดชั่วคราว: ${stat.pausedCount}`}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Month Label */}
                <span
                  className={`w-full truncate text-xs font-bold ${
                    isSelected ? "text-brand-ink" : "text-gray-700"
                  }`}
                >
                  {stat.month.split(" ")[0]}
                </span>
                <span className="text-xs text-gray-500">
                  {stat.month.split(" ")[1]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Scope Switcher */}
      <div className="flex w-fit items-center gap-1.5 rounded-xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => setSelectedTypeFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
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
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            selectedTypeFilter === "product"
              ? "bg-white text-brand-ink shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-pru-red" />
          <span>New Product ({newProductCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTypeFilter("enhancement")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            selectedTypeFilter === "enhancement"
              ? "bg-white text-enhancement shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-enhancement" />
          <span>Enhancement ({enhancementCount})</span>
        </button>
      </div>

      {/* 6. Two Donut Charts Side-by-Side (Page Finishes Here Cleanly) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart A: Channel / Partner Breakdown */}
        <div className="space-y-4 border-2 border-rule bg-white p-4 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Tag className="h-4 w-4 text-slate-700" />
              <span>
                สัดส่วนโครงการแยกตามช่องทาง{" "}
                {isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}
                {selectedMember && (
                  <span className="font-bold text-slate-700">
                    {" "}
                    : {selectedMember}
                  </span>
                )}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              วิเคราะห์ความหนาแน่นของงานในแต่ละพาร์ทเนอร์
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 pt-2 sm:flex-row">
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
                      className="flex flex-col items-center justify-center px-1 text-center"
                    >
                      <span className="max-w-[110px] truncate text-xs font-semibold text-gray-500">
                        {displayChannelLabel}
                      </span>
                      <span className="text-3xl leading-tight font-black text-gray-900">
                        {displayChannelVal}
                      </span>
                      {activeHoveredChannel && totalChannelCount > 0 && (
                        <span className="text-xs font-bold text-brand-ink">
                          {displayChannelPct}%
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                }
              />
            </div>

            <div className="max-h-[220px] w-full space-y-1.5 overflow-y-auto pr-1 sm:flex-1">
              {channelSegments.map((segment) => {
                const isHovered = hoveredChannel === segment.label
                const pct =
                  totalChannelCount > 0
                    ? ((segment.value / totalChannelCount) * 100).toFixed(0)
                    : "0"
                return (
                  <div
                    key={segment.label}
                    onMouseEnter={() => setHoveredChannel(segment.label)}
                    onMouseLeave={() => setHoveredChannel(null)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl p-2 text-xs transition-all ${
                      isHovered
                        ? "bg-slate-100 font-bold shadow-2xs"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate font-semibold text-gray-800">
                        {segment.label}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {segment.value}
                      </span>
                      <span className="w-9 text-right text-xs font-medium text-gray-500">
                        {pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chart B: Team Workload Breakdown with Popup trigger & Co-owner clarity */}
        <div className="space-y-3.5 border-2 border-rule bg-white p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Users className="h-4 w-4 text-brand-ink" />
                <span>
                  {selectedMember
                    ? `สถานะงานของ ${selectedMember} ${isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}`
                    : `การกระจายภาระงานทั้งทีม ${isAnnual ? "(ภาพรวมทั้งปี)" : `(${selectedPeriod})`}`}
                </span>
              </h2>
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
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-brand-ink shadow-2xs transition-colors hover:bg-red-100 sm:self-auto"
              title="เปิดหน้าต่าง Popup ติดตามสถานะงานและรายละเอียดโครงการ"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>เปิดดูงาน (Popup)</span>
            </button>
          </div>

          {/* Co-owner Workload Explanation Banner */}
          {!selectedMember && coOwnedProjectsCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200/60 bg-slate-50/70 p-2.5 text-xs text-slate-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
              <div className="text-xs leading-relaxed">
                <strong>
                  ทำไมยอดรวมถึงเป็น {totalMemberWorkload} ภาระงาน?
                </strong>{" "}
                เนื่องจากมี {coOwnedProjectsCount}{" "}
                โครงการที่มีผู้รับผิดชอบร่วมกัน 2 คน (Co-owners)
                จึงทำให้ยอดภาระงานรายบุคคลนับรวมได้ {totalMemberWorkload} งาน
                จากโครงการจริงทั้งหมด {rawUniqueProjectsCount} โครงการ
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-6 pt-1 sm:flex-row">
            <div
              className="group shrink-0 cursor-pointer"
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
                      className="flex flex-col items-center justify-center px-1 text-center"
                    >
                      <span className="max-w-[110px] truncate text-xs font-semibold text-gray-500">
                        {displayMemberLabel}
                      </span>
                      <span className="text-3xl leading-tight font-black text-gray-900">
                        {displayMemberVal}
                      </span>
                      {totalMemberWorkload > 0 && !selectedMember && (
                        <span className="text-xs font-medium text-gray-500">
                          ({rawUniqueProjectsCount} โครงการจริง)
                        </span>
                      )}
                      {selectedMember && totalMemberWorkload > 0 && (
                        <span className="text-xs font-bold text-brand-ink">
                          {displayMemberPct}
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                }
              />
            </div>

            <div className="max-h-[220px] w-full space-y-1.5 overflow-y-auto pr-1 sm:flex-1">
              {memberSegments.map((segment) => {
                const isHovered = hoveredMember === segment.label
                const pct =
                  totalMemberWorkload > 0
                    ? ((segment.value / totalMemberWorkload) * 100).toFixed(0)
                    : "0"
                const isTeamMember = teamMembers.includes(segment.label)
                const mStat = memberStats[segment.label]

                return (
                  <div
                    key={segment.label}
                    onClick={() => {
                      if (isTeamMember) {
                        handleOpenDeliveryModal(segment.label)
                      }
                    }}
                    onMouseEnter={() => setHoveredMember(segment.label)}
                    onMouseLeave={() => setHoveredMember(null)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl p-2 text-xs transition-all ${
                      isHovered
                        ? "bg-slate-100 font-bold shadow-2xs ring-1 ring-slate-300"
                        : "hover:bg-slate-50"
                    }`}
                    title={
                      isTeamMember
                        ? `คลิกเพื่อเปิด Popup ดูงานของ ${segment.label}`
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate font-semibold text-gray-800">
                        {segment.label}
                      </span>
                      {mStat && mStat.shared > 0 && !selectedMember && (
                        <span className="py-0.2 shrink-0 rounded border border-slate-200 bg-slate-50 px-1 text-xs font-bold text-slate-700">
                          ร่วม {mStat.shared}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {segment.value}
                      </span>
                      <span className="w-9 text-right text-xs font-medium text-gray-500">
                        {pct}%
                      </span>
                      {isTeamMember && (
                        <ExternalLink className="h-3 w-3 shrink-0 text-gray-500 group-hover:text-brand-ink" />
                      )}
                    </div>
                  </div>
                )
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
              ref={deliveryDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-gray-100 bg-slate-50/90 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
                    style={{
                      backgroundColor:
                        modalMember && modalMember !== "ALL_TEAM"
                          ? memberColors[modalMember] || "#ED1C24"
                          : "#1E293B",
                    }}
                  >
                    {modalMember && modalMember !== "ALL_TEAM" ? (
                      <UserCheck className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id="delivery-modal-title"
                        className="text-base font-black tracking-tight text-gray-900 sm:text-lg"
                      >
                        สถานะการส่งมอบโครงการ :{" "}
                        {modalMember && modalMember !== "ALL_TEAM"
                          ? modalMember
                          : "ทั้งทีม (All Team)"}
                      </h3>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-gray-500">
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
                  className="cursor-pointer self-end rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-700 sm:self-auto"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Member Selector Tabs inside Modal */}
              <div className="flex shrink-0 scrollbar-thin items-center gap-1.5 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5">
                <span className="mr-1 shrink-0 text-xs font-bold text-gray-500">
                  สลับดู:
                </span>
                <button
                  type="button"
                  onClick={() => setModalMember("ALL_TEAM")}
                  className={`shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    modalMember === "ALL_TEAM" || modalMember === null
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ทั้งทีม ({allTeamItemsWithStatus.length})
                </button>
                {teamMembers.map((member) => {
                  const isSel = modalMember === member
                  const mColor = memberColors[member] || "#ED1C24"
                  const mStat = memberStats[member] || {
                    total: 0,
                    completed: 0,
                    pending: 0,
                  }
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => setModalMember(member)}
                      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        isSel
                          ? "text-white shadow-2xs"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                      style={isSel ? { backgroundColor: mColor } : undefined}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: isSel ? "#FFFFFF" : mColor }}
                      />
                      <span>{member}</span>
                      <span
                        className={`py-0.2 rounded-full px-1 text-xs font-black ${
                          isSel
                            ? "bg-black/20 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {mStat.total}
                      </span>
                      {mStat.pending > 0 && (
                        <span
                          className={`py-0.2 rounded px-1 text-xs font-semibold ${
                            isSel
                              ? "bg-black/30 text-amber-200"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          ค้าง {mStat.pending}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Modal Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                {/* Summary Cards inside Modal */}
                <div
                  className={`grid grid-cols-1 gap-3 ${modalPausedItems.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
                >
                  {/* Card 1: Pending */}
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter("pending")}
                    className={`cursor-pointer rounded-2xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                      modalStatusFilter === "pending"
                        ? "border-pru-red bg-pru-red-soft"
                        : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                          <span>ยังไม่เสร็จ / ค้างอยู่</span>
                        </div>
                        <div className="mt-1 text-2xl font-black text-amber-600 sm:text-3xl">
                          {modalPendingItems.length}{" "}
                          <span className="text-xs font-bold text-amber-700">
                            โครงการ
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          modalStatusFilter === "pending"
                            ? "bg-amber-500 text-white"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                  </button>

                  {/* Card 2: Completed */}
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter("completed")}
                    className={`cursor-pointer rounded-2xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                      modalStatusFilter === "completed"
                        ? "border-ink bg-surface"
                        : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>เสร็จสมบูรณ์แล้ว</span>
                        </div>
                        <div className="mt-1 text-2xl font-black text-emerald-600 sm:text-3xl">
                          {modalCompletedItems.length}{" "}
                          <span className="text-xs font-bold text-emerald-700">
                            โครงการ
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          modalStatusFilter === "completed"
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>
                  </button>

                  {/* Card 3: Paused (only when there are any) */}
                  {modalPausedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalStatusFilter("paused")}
                      className={`cursor-pointer rounded-2xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                        modalStatusFilter === "paused"
                          ? "border-slate-400 bg-slate-50 shadow-xs ring-2 ring-slate-400/20"
                          : "border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            <span>หยุดชั่วคราว</span>
                          </div>
                          <div className="mt-1 text-2xl font-black text-slate-500 sm:text-3xl">
                            {modalPausedItems.length}{" "}
                            <span className="text-xs font-bold text-slate-500">
                              โครงการ
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            modalStatusFilter === "paused"
                              ? "bg-slate-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <PauseCircle className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Filter and Search Row inside Modal */}
                <div className="flex flex-col justify-between gap-2 pt-1 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                        modalStatusFilter === "pending"
                          ? "border border-amber-200 bg-amber-50 text-amber-800"
                          : modalStatusFilter === "completed"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : modalStatusFilter === "paused"
                              ? "border border-slate-300 bg-slate-50 text-slate-600"
                              : "border border-slate-200 bg-slate-100 text-slate-800"
                      }`}
                    >
                      {modalStatusFilter === "pending" && (
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      {modalStatusFilter === "completed" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      {modalStatusFilter === "paused" && (
                        <PauseCircle className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      {modalStatusFilter === "all" && (
                        <Layers className="h-3.5 w-3.5 text-slate-600" />
                      )}
                      <span>
                        {modalStatusFilter === "pending"
                          ? `งานที่ค้างอยู่ (${modalDisplayedItems.length})`
                          : modalStatusFilter === "completed"
                            ? `งานที่เสร็จแล้ว (${modalDisplayedItems.length})`
                            : modalStatusFilter === "paused"
                              ? `งานที่หยุดชั่วคราว (${modalDisplayedItems.length})`
                              : `งานทั้งหมด (${modalDisplayedItems.length})`}
                      </span>
                    </span>

                    {modalStatusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => setModalStatusFilter("all")}
                        className="cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                      >
                        ดูทั้งหมด ({modalItems.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalStatusFilter("pending")}
                        className="cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 transition-colors"
                      >
                        เฉพาะงานค้าง ({modalPendingItems.length})
                      </button>
                    )}
                  </div>

                  {/* Search Input inside Modal */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อโครงการ, ช่องทาง..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pr-3 pl-7 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
                    />
                  </div>
                </div>

                {/* Visual Cards Grid in Modal (แบบ B) */}
                {modalDisplayedItems.length === 0 ? (
                  <div className="space-y-1.5 rounded-2xl border border-dashed border-gray-200 bg-slate-50 py-10 text-center text-xs text-gray-500">
                    <div className="text-2xl">
                      {modalStatusFilter === "pending"
                        ? "🎉"
                        : modalStatusFilter === "completed"
                          ? "📦"
                          : "🔍"}
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {modalDisplayedItems.map((item) => {
                      const brokerColor = resolveBrokerColor(
                        item.broker,
                        colorMap
                      )
                      const ownerColor = getOwnerColor(item.owner)
                      const isCoOwned = isItemCoOwned(item.owner)
                      const hasElearning = Boolean(
                        item.milestones?.["first-draft-elearning"] ||
                        item.milestones?.["final-elearning"]
                      )

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between space-y-2.5 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs transition-all hover:bg-slate-50/80"
                        >
                          {/* Top Row: Channel + Co-owner badge + Phase status */}
                          <div className="flex items-center justify-between gap-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black tracking-tight text-ink-soft">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: brokerColor }}
                                  aria-hidden="true"
                                />
                                {item.broker}
                              </span>
                              {isCoOwned && (
                                <span className="py-0.2 inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-xs font-bold text-slate-700">
                                  <Users className="h-2.5 w-2.5" /> งานร่วม
                                </span>
                              )}
                              {isAnnual &&
                                item.activeMonths &&
                                item.activeMonths.length > 0 && (
                                  <span className="py-0.2 rounded border border-slate-200 bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
                                    {item.activeMonths.join(", ")}
                                  </span>
                                )}
                            </div>

                            {item.isCompleted ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />{" "}
                                เปิดตัวแล้ว
                              </span>
                            ) : item.isPaused ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                <PauseCircle className="h-3 w-3 text-slate-500" />{" "}
                                {item.currentPhaseLabel}
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                                <Clock className="h-3 w-3 animate-pulse text-amber-600" />{" "}
                                {item.currentPhaseLabel}
                              </span>
                            )}
                          </div>

                          {/* Project Name */}
                          <div>
                            <h4 className="line-clamp-2 text-xs leading-snug font-bold text-gray-900 sm:text-sm">
                              {item.name}
                            </h4>
                          </div>

                          {/* Owner & eLearning */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-1 text-xs">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                                style={{ backgroundColor: ownerColor }}
                              />
                              <span className="max-w-[170px] truncate font-semibold text-gray-700">
                                👤 {item.owner || "ยังไม่ระบุ"}
                              </span>
                            </div>
                            {hasElearning && (
                              <span className="py-0.2 flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-xs font-bold text-slate-700">
                                <GraduationCap className="h-2.5 w-2.5" />{" "}
                                eLearning
                              </span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-2 border-t border-dashed border-gray-100 pt-1 text-xs">
                            <div className="rounded-lg bg-slate-50 p-1 px-1.5">
                              <span className="block text-xs font-medium text-gray-500">
                                Internal
                              </span>
                              <span className="block truncate font-bold text-gray-700">
                                {item.internalDate || "TBC"}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg p-1 px-1.5 ${
                                item.isCompleted
                                  ? "border border-emerald-100 bg-emerald-50 text-emerald-800"
                                  : "border border-red-100 bg-red-50 text-brand-ink"
                              }`}
                            >
                              <span className="block text-xs font-medium opacity-75">
                                Target Launch
                              </span>
                              <span className="block truncate font-bold">
                                {item.commercialDate ||
                                  item.customRightLabel ||
                                  "TBC"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-slate-50 px-4 py-3 text-xs sm:px-5">
                <span className="font-medium text-gray-500">
                  แสดง {modalDisplayedItems.length} จากทั้งหมด{" "}
                  {modalItems.length} โครงการ
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-800 px-4 py-1.5 font-bold text-white shadow-2xs transition-colors hover:bg-slate-900"
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

      {/* Off-screen Dedicated Channel Summary Board (Pristine 2K Image Export) */}
      <div
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          zIndex: -50,
        }}
        aria-hidden="true"
      >
        <ChannelSummaryExportBoard
          ref={channelExportRef}
          selectedPeriod={
            isAnnual ? `ภาพรวมทั้งปี ${activeYearTh}` : selectedPeriod
          }
          isAnnual={isAnnual}
          products={rawProducts}
          enhancements={rawEnhancements}
          colorMap={colorMap}
        />
      </div>
    </div>
  )
}
