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
  Users,
  Layers,
  GraduationCap,
  Lock,
  Clock,
  CheckCircle2,
  Search,
  UserCheck,
  X,
  Loader2,
  PauseCircle,
} from "lucide-react"
import Link from "next/link"
import { toPng } from "html-to-image"

import { usePartners } from "@/hooks/use-partners"
import { UNASSIGNED_PARTNER, partnerOf } from "@/lib/partners"
import { Icon } from "@/components/icon"
import {
  PageBody,
  PageHero,
  card,
  cardButton,
  heroButton,
  heroButtonSolid,
} from "@/components/page-hero"
import { updateChannelSummarySnapshot } from "@/lib/supabase"
import { toast } from "@/lib/notify"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"
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

  // Partner colours shared with the Timeline
  const { partners } = usePartners()

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

  // Projects by partner: channels roll up into their partner's colour
  const partnerSegments = useMemo(() => {
    const map = new Map<
      string,
      { label: string; value: number; color: string; parts: Record<string, number>; order: number }
    >()
    const order = [...partners, UNASSIGNED_PARTNER].map((p) => p.id)
    Object.entries(channelCounts).forEach(([channel, count]) => {
      const p = partnerOf(channel, partners)
      const row = map.get(p.id) || {
        label: p.name,
        value: 0,
        color: p.color,
        parts: {},
        order: order.indexOf(p.id),
      }
      row.value += count
      row.parts[channel] = (row.parts[channel] || 0) + count
      map.set(p.id, row)
    })
    return Array.from(map.values())
      .sort((x, y) => y.value - x.value || x.order - y.order)
      .map((r) => ({
        label: r.label,
        value: r.value,
        color: r.color,
        channels: Object.entries(r.parts)
          .map(([c, n]) => `${c} ${n}`)
          .join(" · "),
      }))
  }, [channelCounts, partners])

  const totalPartnerCount = partnerSegments.reduce((s, c) => s + c.value, 0)
  const activeHoveredPartner = partnerSegments.find(
    (s) => s.label === hoveredChannel
  )
  const displayPartnerVal = activeHoveredPartner?.value ?? totalPartnerCount
  const displayPartnerLabel = activeHoveredPartner?.label ?? "All partners"

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
        { label: "Completed", value: mStat.completed, color: "#15803D" },
        {
          label: "In progress",
          value: mStat.pending,
          color: "#ED1B2E",
        },
        ...(mStat.paused > 0
          ? [{ label: "On hold", value: mStat.paused, color: "#A8A29E" }]
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

  const completionPct =
    rawUniqueProjectsCount > 0
      ? Math.round((allTeamCompletedCount / rawUniqueProjectsCount) * 100)
      : 0
  const maxMonth = Math.max(1, ...monthlyStats.map((s) => s.totalCount))
  const kpiCard = `${card} flex flex-col gap-3 p-5`

  return (
    <div>
      <PageHero>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {availableYears && availableYears.length > 0 && setSelectedYear ? (
                <label className="inline-flex items-center">
                  <span className="sr-only">Year</span>
                  <select
                    value={activeYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value, 10))
                      setSelectedPeriod("ALL_YEAR")
                    }}
                    className="h-10 rounded-full border-[1.5px] border-white/55 bg-transparent px-4 text-sm font-semibold text-white [&>option]:text-ink"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y} (พ.ศ. {y + 543})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="inline-flex items-center">
                <span className="sr-only">Period</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="h-10 rounded-full border-[1.5px] border-white/55 bg-transparent px-4 text-sm font-semibold text-white [&>option]:text-ink"
                >
                  <option value="ALL_YEAR">All year {activeYear}</option>
                  <optgroup label={`Months of ${activeYear}`}>
                    {yearMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              {!isAnnual && (
                <button type="button" onClick={() => setSelectedPeriod("ALL_YEAR")} className={heroButton}>
                  <Icon name="refresh" size={16} />
                  All year
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsTeamModalOpen(true)} className={heroButton}>
                <Icon name="team" size={18} />
                Team ({teamMembers.length})
              </button>
              <button type="button" onClick={handleSendToLine} disabled={isSendingLine} className={heroButton}>
                {isSendingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={18} />}
                {isSendingLine ? "Sending…" : "Send to LINE"}
              </button>
              <button type="button" onClick={handleExportImage} disabled={isExporting} className={heroButtonSolid}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
                {isExporting ? "Saving…" : "Save image"}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="flex flex-col gap-4">
              <div className="text-lg font-semibold">
                Analytics · {isAnnual ? `All year ${activeYear}` : selectedPeriod}
              </div>
              <div className="flex items-end gap-4">
                <span className="text-[88px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[124px]">
                  {allTeamCompletedCount}
                </span>
                <span className="pb-1.5 text-2xl leading-tight font-bold sm:text-[28px]">
                  of {rawUniqueProjectsCount} projects
                  <br />
                  completed
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-2 font-bold text-brand-ink">
                  <Icon name="inProgress" size={22} strokeWidth={2} />
                  {allTeamPendingCount} In progress
                </span>
                {allTeamPausedCount > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1.5 pr-3.5 pl-2 font-semibold">
                    <Icon name="onHold" size={22} strokeWidth={2} />
                    {allTeamPausedCount} On hold
                  </span>
                )}
                {isAnnual && <span className="text-sm">นับ project ไม่ซ้ำข้ามเดือน</span>}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Completion {completionPct}%</div>
              <div className="flex h-4 gap-[3px] overflow-hidden rounded-full">
                <span className="bg-white" style={{ flex: allTeamCompletedCount || 0.001 }} />
                <span className="bg-white/30" style={{ flex: allTeamPendingCount + allTeamPausedCount || 0.001 }} />
              </div>
              <div className="mt-2 flex justify-between text-[13px]">
                <span>{allTeamCompletedCount} Completed</span>
                <span>{allTeamPendingCount + allTeamPausedCount} Not yet</span>
              </div>
            </div>
          </div>
        </div>
      </PageHero>

      <PageBody className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Owner filter */}
        <section className={`${card} flex flex-wrap items-center gap-2.5 px-5 py-4 lg:col-span-12`}>
          <span className="mr-1.5 inline-flex items-center gap-2 text-sm font-bold">
            <Icon name="user" size={20} />
            View by owner
          </span>
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            aria-pressed={selectedMember === null}
            className={`touch-target inline-flex h-10 items-center gap-2 rounded-full pr-1.5 pl-3 text-sm font-semibold ${selectedMember === null ? "bg-ink text-white" : "bg-surface text-ink hover:bg-rule"}`}
          >
            <Icon name="team" size={18} />
            Whole team
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selectedMember === null ? "bg-white/20" : "bg-white"}`}>
              {rawUniqueProjectsCount}
            </span>
            {allTeamPendingCount > 0 && (
              <span className="rounded-full bg-pru-red px-2 py-0.5 text-xs font-bold text-white">
                {allTeamPendingCount} open
              </span>
            )}
          </button>
          {teamMembers.map((member) => {
            const isSelected = selectedMember === member
            const color = memberColors[member] || "#57534E"
            const stat = memberStats[member] || { total: 0, pending: 0 }
            return (
              <button
                key={member}
                type="button"
                onClick={() => setSelectedMember(isSelected ? null : member)}
                aria-pressed={isSelected}
                className={`touch-target inline-flex h-10 items-center gap-2 rounded-full pr-1.5 pl-1.5 text-sm font-semibold ${isSelected ? "bg-ink text-white" : "bg-surface text-ink hover:bg-rule"}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
                  {member.split(" ").map((w) => w[0]).join("")}
                </span>
                <span className="max-w-[130px] truncate">{member}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isSelected ? "bg-white/20" : "bg-white"}`}>{stat.total}</span>
                {stat.pending > 0 && (
                  <span className="rounded-full bg-pru-red-soft px-2 py-0.5 text-xs font-bold text-brand-ink">{stat.pending} open</span>
                )}
              </button>
            )
          })}
          <span className="flex-1" />
          <button type="button" onClick={() => handleOpenDeliveryModal(selectedMember)} className={cardButton}>
            <Icon name="external" size={16} />
            Open project list
          </button>
        </section>

        {/* KPI cards */}
        <section className="flex flex-col gap-3 rounded-[20px] bg-ink p-5 text-white shadow-[var(--shadow-card)] lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="text-sm">{selectedMember ? `Projects of ${selectedMember}` : isAnnual ? "Projects this year" : `Projects in ${selectedPeriod}`}</span>
              <span className="block text-[56px] leading-tight font-bold">{totalProjects}</span>
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/10">
              <Icon name="folder" size={24} />
            </span>
          </div>
          <span className="text-[13px] text-gray-300">
            {pausedProjectsCount > 0 ? `${pausedProjectsCount} on hold · ` : ""}
            {isAnnual ? "ไม่นับซ้ำข้ามเดือน" : "New Product + Enhancement"}
          </span>
        </section>
        <section className={`${kpiCard} lg:col-span-3`}>
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="text-sm font-semibold text-brand-ink">New Product</span>
              <span className="block text-[44px] leading-tight font-bold">{newProductCount}</span>
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-pru-red-soft text-brand-ink">
              <Icon name="product" size={24} />
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-pru-red" style={{ width: `${totalProjects > 0 ? (newProductCount / totalProjects) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-ink-soft">
            {totalProjects > 0 ? Math.round((newProductCount / totalProjects) * 100) : 0}% of all projects
          </span>
        </section>
        <section className={`${kpiCard} lg:col-span-3`}>
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="text-sm font-semibold text-ink-soft">Enhancement</span>
              <span className="block text-[44px] leading-tight font-bold">{enhancementCount}</span>
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface text-ink-soft">
              <Icon name="wrench" size={24} />
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-enhancement" style={{ width: `${totalProjects > 0 ? (enhancementCount / totalProjects) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-ink-soft">
            {totalProjects > 0 ? Math.round((enhancementCount / totalProjects) * 100) : 0}% of all projects
          </span>
        </section>
        <section className={`${kpiCard} lg:col-span-3`}>
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="text-sm font-semibold text-ink-soft">With e-learning</span>
              <span className="block text-[44px] leading-tight font-bold">{totalElearning}</span>
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface text-ink-soft">
              <Icon name="elearning" size={24} />
            </span>
          </div>
          <span className="text-xs text-ink-soft">คอร์สอบรมออนไลน์บนระบบ</span>
        </section>

        {/* Projects per month */}
        <section className={`${card} flex flex-col gap-4 p-6 lg:col-span-12`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
                <Icon name="chart" size={18} />
              </span>
              Projects per month · {activeYear}
              {selectedMember && <span className="text-brand-ink">· {selectedMember}</span>}
            </h2>
            <span className="flex gap-4 text-[13px]">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-pru-red" />New Product</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-enhancement" />Enhancement</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-gray-300" />On hold</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-12 gap-3">
              {monthlyStats.map((stat) => {
                const isSelected = selectedPeriod === stat.month
                const h = (n: number) => `${Math.round((n / maxMonth) * 170)}px`
                return (
                  <button
                    key={stat.month}
                    type="button"
                    onClick={() => setSelectedPeriod(stat.month)}
                    aria-pressed={isSelected}
                    title={`${stat.month}: ${stat.totalCount} projects`}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-1 pt-1 pb-2 ${isSelected ? "bg-pru-red-soft" : "hover:bg-surface"}`}
                  >
                    <b className={`text-[15px] ${isSelected ? "text-brand-ink" : ""}`}>{stat.totalCount}</b>
                    <span className="flex h-[176px] w-full max-w-[46px] flex-col justify-end">
                      <span className="flex flex-col overflow-hidden rounded-t-[10px] rounded-b-[4px]">
                        <span className="bg-pru-red" style={{ height: h(stat.productsCount) }} />
                        <span className="bg-enhancement" style={{ height: h(stat.enhancementsCount) }} />
                        <span className="bg-gray-300" style={{ height: h(stat.pausedCount) }} />
                      </span>
                    </span>
                    <span className={`text-xs ${isSelected ? "font-bold text-brand-ink" : "font-medium text-ink-soft"}`}>
                      {stat.month.split(" ")[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <span className="text-xs text-ink-soft">กดแท่งเพื่อดูเดือนนั้น</span>
        </section>

        {/* Type filter */}
        <div className="flex w-fit gap-0.5 rounded-full bg-rule p-1 lg:col-span-12">
          {[
            { v: "all" as const, label: `All (${totalProjects})`, dot: "" },
            { v: "product" as const, label: `New Product (${newProductCount})`, dot: "bg-pru-red" },
            { v: "enhancement" as const, label: `Enhancement (${enhancementCount})`, dot: "bg-enhancement" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setSelectedTypeFilter(o.v)}
              aria-pressed={selectedTypeFilter === o.v}
              className={`touch-target inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold ${selectedTypeFilter === o.v ? "bg-white text-ink shadow-[var(--shadow-card)]" : "text-ink-soft hover:text-ink"}`}
            >
              {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
              {o.label}
            </button>
          ))}
        </div>

        {/* Partners */}
        <section className={`${card} flex flex-col gap-4 p-6 lg:col-span-6`}>
          <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-surface text-ink">
              <Icon name="partner" size={18} />
            </span>
            Projects by partner
            <span className="text-xs font-normal text-ink-soft">{isAnnual ? "All year" : selectedPeriod}</span>
          </h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="shrink-0">
              <DonutChart
                data={partnerSegments}
                size={200}
                strokeWidth={24}
                animationDuration={0.8}
                highlightOnHover={true}
                centerContent={
                  <span className="flex flex-col items-center px-1 text-center">
                    <span className="max-w-[110px] truncate text-xs font-semibold text-ink-soft">{displayPartnerLabel}</span>
                    <span className="text-3xl leading-tight font-bold">{displayPartnerVal}</span>
                    {activeHoveredPartner && totalPartnerCount > 0 && (
                      <span className="text-xs font-bold text-brand-ink">
                        {Math.round((activeHoveredPartner.value / totalPartnerCount) * 100)}%
                      </span>
                    )}
                  </span>
                }
              />
            </div>
            <div className="w-full flex-1">
              {partnerSegments.map((segment) => {
                const pct = totalPartnerCount > 0 ? Math.round((segment.value / totalPartnerCount) * 100) : 0
                return (
                  <div
                    key={segment.label}
                    onMouseEnter={() => setHoveredChannel(segment.label)}
                    onMouseLeave={() => setHoveredChannel(null)}
                    className={`grid grid-cols-[minmax(0,1fr)_40px_44px] items-center gap-2 border-b border-surface py-2 text-sm ${hoveredChannel === segment.label ? "bg-surface" : ""}`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: segment.color }} />
                        <b className="truncate">{segment.label}</b>
                      </span>
                      <span className="truncate pl-5 text-xs text-ink-soft">{segment.channels}</span>
                    </span>
                    <b className="text-right">{segment.value}</b>
                    <span className="text-right text-xs text-ink-soft">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Team workload */}
        <section className={`${card} flex flex-col gap-4 p-6 lg:col-span-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-surface text-ink">
                <Icon name="team" size={18} />
              </span>
              {selectedMember ? `Status of ${selectedMember}` : "Team workload"}
            </h2>
            <button type="button" onClick={() => handleOpenDeliveryModal(selectedMember)} className={cardButton}>
              <Icon name="external" size={16} />
              Open list
            </button>
          </div>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <button
              type="button"
              className="shrink-0"
              onClick={() => handleOpenDeliveryModal(selectedMember)}
              aria-label="Open the project list"
            >
              <DonutChart
                data={memberSegments}
                size={200}
                strokeWidth={24}
                animationDuration={0.8}
                highlightOnHover={true}
                centerContent={
                  <span className="flex flex-col items-center px-1 text-center">
                    <span className="max-w-[110px] truncate text-xs font-semibold text-ink-soft">
                      {activeHoveredMember?.label ?? (selectedMember ? "Projects" : "Assignments")}
                    </span>
                    <span className="text-3xl leading-tight font-bold">{displayMemberVal}</span>
                    {!selectedMember && totalMemberWorkload > 0 && (
                      <span className="text-[11px] text-ink-soft">from {rawUniqueProjectsCount} projects</span>
                    )}
                  </span>
                }
              />
            </button>
            <div className="w-full flex-1">
              {memberSegments.map((segment) => {
                const pct = totalMemberWorkload > 0 ? Math.round((segment.value / totalMemberWorkload) * 100) : 0
                const isTeamMember = teamMembers.includes(segment.label)
                const mStat = memberStats[segment.label]
                return (
                  <button
                    key={segment.label}
                    type="button"
                    disabled={!isTeamMember}
                    onClick={() => isTeamMember && handleOpenDeliveryModal(segment.label)}
                    onMouseEnter={() => setHoveredMember(segment.label)}
                    onMouseLeave={() => setHoveredMember(null)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_40px_44px] items-center gap-2 border-b border-surface py-2 text-left text-sm ${hoveredMember === segment.label ? "bg-surface" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: segment.color }} />
                      <b className="truncate">{segment.label}</b>
                      {mStat && mStat.shared > 0 && !selectedMember && (
                        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                          co-owner {mStat.shared}
                        </span>
                      )}
                    </span>
                    <b className="text-right">{segment.value}</b>
                    <span className="text-right text-xs text-ink-soft">{pct}%</span>
                  </button>
                )
              })}
            </div>
          </div>
          {!selectedMember && coOwnedProjectsCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-xs text-ink">
              <Icon name="info" size={18} className="shrink-0" />
              <span>
                {totalMemberWorkload} มากกว่า {rawUniqueProjectsCount} เพราะมี {coOwnedProjectsCount} projects
                ที่มีผู้รับผิดชอบร่วม 2 คน จึงนับให้ทั้งสองคน
              </span>
            </div>
          )}
        </section>
      </PageBody>

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
                      const brokerColor = partnerOf(item.broker, partners).color
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
          partners={partners}
        />
      </div>
    </div>
  )
}
