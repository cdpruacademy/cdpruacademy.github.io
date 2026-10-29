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
import { Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import { toPng } from "html-to-image"

import { usePartners } from "@/hooks/use-partners"
import { UNASSIGNED_PARTNER, inkOf, partnerOf } from "@/lib/partners"
import { Icon, PHASE_ICONS } from "@/components/icon"
import { PickMenu } from "@/components/ui/pick-menu"
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

    let currentPhaseLabel = isCompleted ? "Completed" : "Kick-off"
    let currentPhaseKey = isCompleted ? "launch" : "kick-off"
    if (isPaused) {
      currentPhaseLabel = item.pausedSince ? `On hold since ${item.pausedSince}` : "On hold"
    } else if (!isCompleted) {
      const phases: { key: PhaseKey; label: string }[] = [
        { key: "kick-off", label: "Kick-off" },
        { key: "first-draft", label: "First Draft" },
        { key: "first-draft-elearning", label: "First Draft e-learning" },
        { key: "final-approval", label: "Final Approval" },
        { key: "final-elearning", label: "Final e-learning" },
        { key: "internal-training", label: "Internal Training" },
      ]
      // The step marked Current wins; otherwise the first step not completed yet
      const current =
        phases.find((p) => item.milestones?.[p.key]?.isElearningIcon) ||
        phases.find((p) => {
          const m = item.milestones?.[p.key]
          return m && m.status !== "completed"
        })
      if (current) {
        currentPhaseLabel = current.label
        currentPhaseKey = current.key
      } else if (item.milestones?.["internal-training"]?.status === "completed") {
        currentPhaseLabel = "Target Launch"
        currentPhaseKey = "launch"
      }
    }

    return {
      ...item,
      isCompleted,
      isPaused,
      currentPhaseLabel,
      currentPhaseKey,
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
      color: memberColors[member] || "#ED1B2E",
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
    return matched ? memberColors[matched] || "#ED1B2E" : "#64748B"
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
                <PickMenu
                  label="Year"
                  value={String(activeYear)}
                  onChange={(v) => {
                    setSelectedYear(parseInt(v, 10))
                    setSelectedPeriod("ALL_YEAR")
                  }}
                  options={availableYears.map((y) => ({ value: String(y), label: `${y} (พ.ศ. ${y + 543})` }))}
                  className="h-10 rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
                />
              ) : null}
              <PickMenu
                label="Period"
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={[
                  { value: "ALL_YEAR", label: `All year ${activeYear}` },
                  ...yearMonths.map((m) => ({ value: m, label: m, group: `Months of ${activeYear}` })),
                ]}
                className="h-10 rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
              />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeliveryModalOpen(false)}
              className="fixed inset-0 bg-ink/40"
              aria-hidden="true"
            />

            <motion.div
              ref={deliveryDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-modal-title"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_-16px_rgba(28,25,23,0.45)]"
            >
              {/* Header */}
              <header className="flex items-center gap-3.5 px-4 pt-5 pb-4 sm:px-7">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-sm font-bold text-white"
                  style={{
                    backgroundColor: modalMember ? memberColors[modalMember] || "#ED1B2E" : "#ED1B2E",
                  }}
                >
                  {modalMember ? (
                    modalMember
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w.charAt(0))
                      .join("")
                      .toUpperCase()
                  ) : (
                    <Icon name="team" size={22} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="delivery-modal-title"
                    className="flex flex-wrap items-center gap-2 text-lg leading-tight font-bold text-ink sm:text-[22px]"
                  >
                    Projects · {modalMember || "All team"}
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-[13px] font-semibold text-ink-soft">
                      {isAnnual ? `Year ${selectedYear}` : selectedPeriod}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {modalMember
                      ? `Projects ที่ ${modalMember} ดูแล · ${modalItems.length} projects`
                      : `ทุก project ของทีมพัฒนาหลักสูตร · ${modalItems.length} projects`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  aria-label="ปิด"
                  className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink hover:bg-rule"
                >
                  <Icon name="close" size={20} strokeWidth={2} />
                </button>
              </header>

              {/* Member chips */}
              <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-4 sm:flex-wrap sm:px-7">
                {[null, ...teamMembers].map((member) => {
                  const on = modalMember === member || (!member && !modalMember)
                  const color = member ? memberColors[member] || "#ED1B2E" : "#1C1917"
                  const count = member ? memberStats[member]?.total || 0 : allTeamItemsWithStatus.length
                  return (
                    <button
                      key={member || "ALL_TEAM"}
                      type="button"
                      onClick={() => setModalMember(member)}
                      aria-pressed={on}
                      className={`touch-target inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] pr-1.5 pl-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                        on ? "text-white" : "border-rule bg-white text-ink hover:bg-surface"
                      }`}
                      style={on ? { backgroundColor: color, borderColor: color } : undefined}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: on ? "#FFFFFF" : color }}
                      />
                      {member || "All team"}
                      <span
                        className={`inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                          on ? "bg-black/20" : "bg-surface"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {/* Status tiles */}
                <div className="grid shrink-0 grid-cols-3 gap-2 px-4 pb-4 sm:gap-3 sm:px-7">
                  {(
                    [
                      { key: "pending", label: "In progress", n: modalPendingItems.length, icon: "inProgress", fg: "text-brand-ink", soft: "bg-pru-red-soft", solid: "bg-pru-red", ring: "border-pru-red-line" },
                      { key: "completed", label: "Completed", n: modalCompletedItems.length, icon: "completed", fg: "text-done", soft: "bg-done-soft", solid: "bg-done", ring: "border-[#bbe3ca]" },
                      { key: "paused", label: "On hold", n: modalPausedItems.length, icon: "onHold", fg: "text-ink-soft", soft: "bg-surface", solid: "bg-ink-soft", ring: "border-stone-300" },
                    ] as const
                  ).map((t) => {
                    const on = modalStatusFilter === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setModalStatusFilter(on ? "all" : t.key)}
                        aria-pressed={on}
                        className={`flex items-center gap-3 rounded-[18px] border-2 p-3 text-left transition-colors sm:px-4 ${
                          on ? `${t.soft} ${t.ring}` : "border-rule bg-white hover:bg-paper"
                        }`}
                      >
                        <span
                          className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] sm:flex ${
                            on ? `${t.solid} text-white` : `${t.soft} ${t.fg}`
                          }`}
                        >
                          <Icon name={t.icon} size={22} strokeWidth={2} />
                        </span>
                        <span>
                          <span className="block text-[13px] font-semibold text-stone-700 sm:text-sm">{t.label}</span>
                          <span className={`text-2xl leading-tight font-bold tabular-nums sm:text-[30px] ${t.fg}`}>
                            {t.n}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Search */}
                <div className="flex shrink-0 items-center gap-3 px-4 pb-2 sm:px-7">
                  <span className="relative w-full max-w-[420px]">
                    <Icon
                      name="search"
                      size={18}
                      strokeWidth={2}
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
                    />
                    <label htmlFor="delivery-search" className="sr-only">
                      ค้นหา project
                    </label>
                    <input
                      id="delivery-search"
                      type="text"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ project, Channel หรือ Owner"
                      className="h-11 w-full rounded-full border-[1.5px] border-rule pr-4 pl-10 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
                    />
                  </span>
                  {modalStatusFilter === "all" && (
                    <span className="text-[13px] text-ink-soft">ทุกสถานะ</span>
                  )}
                </div>

                {/* List */}
                <div className="px-2 pb-2 sm:px-5">
                  {modalDisplayedItems.length === 0 ? (
                    <div className="m-2 flex flex-col items-center gap-2 rounded-2xl bg-paper py-10 text-center">
                      <Icon
                        name={modalSearchQuery ? "search" : modalStatusFilter === "pending" ? "completed" : "folder"}
                        size={28}
                        className="text-ink-soft"
                      />
                      <p className="text-sm font-semibold text-stone-700">
                        {modalSearchQuery
                          ? "ไม่พบ project ที่ค้นหา"
                          : modalStatusFilter === "pending"
                            ? "ไม่มี project ที่ยังทำอยู่"
                            : modalStatusFilter === "completed"
                              ? "ยังไม่มี project ที่ Completed ในช่วงนี้"
                              : "ไม่มี project ในกลุ่มนี้"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden grid-cols-[minmax(0,1fr)_170px_210px_76px] gap-4 px-4 py-1.5 text-xs font-bold text-ink-soft md:grid">
                        <span>Project</span>
                        <span>Owner</span>
                        <span>{modalStatusFilter === "completed" ? "Status" : "Current step"}</span>
                        <span className="text-center">Launch</span>
                      </div>
                      <ul>
                        {modalDisplayedItems.map((item) => {
                          const partner = partnerOf(item.broker, partners)
                          const launch = item.commercialDate || item.customRightLabel || ""
                          const [day, mon] = launch.split(/\s+/)
                          const hasDate = Boolean(day && mon && /^\d/.test(day))
                          const tone = item.isCompleted ? "done" : item.isPaused ? "hold" : "now"
                          return (
                            <li
                              key={item.id}
                              className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-x-4 gap-y-2 rounded-2xl border-t border-surface px-3 py-3 hover:bg-paper md:grid-cols-[minmax(0,1fr)_170px_210px_76px] md:px-4"
                            >
                              <span className="flex min-w-0 flex-col gap-1">
                                <b className="truncate text-[15px] text-ink" title={item.name}>
                                  {item.name}
                                </b>
                                <span
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                                  style={{ color: inkOf(partner.color) }}
                                >
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: partner.color }} />
                                  {partner.name} · {item.broker}
                                  {isAnnual && item.activeMonths && item.activeMonths.length > 0 && (
                                    <span className="font-medium text-ink-soft">· {item.activeMonths.join(", ")}</span>
                                  )}
                                </span>
                              </span>
                              <span className="order-3 col-span-2 inline-flex items-center gap-1.5 text-[13px] text-stone-700 md:order-none md:col-span-1">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: getOwnerColor(item.owner) }}
                                />
                                <span className="truncate">{item.owner || "ยังไม่ระบุ"}</span>
                              </span>
                              <span
                                className={`order-4 col-span-2 inline-flex items-center gap-2 text-[13px] font-semibold md:order-none md:col-span-1 ${
                                  tone === "done" ? "text-done" : tone === "hold" ? "text-ink-soft" : "text-brand-ink"
                                }`}
                              >
                                <span
                                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-white ${
                                    tone === "done" ? "bg-done" : tone === "hold" ? "bg-ink-soft" : "bg-pru-red"
                                  }`}
                                >
                                  <Icon
                                    name={
                                      tone === "done"
                                        ? "check"
                                        : tone === "hold"
                                          ? "onHold"
                                          : PHASE_ICONS[item.currentPhaseKey] || "inProgress"
                                    }
                                    size={15}
                                    strokeWidth={2}
                                  />
                                </span>
                                {item.currentPhaseLabel}
                              </span>
                              <span
                                className={`col-start-2 row-start-1 w-16 justify-self-center overflow-hidden rounded-xl border-[1.5px] text-center md:col-start-auto md:row-start-auto ${
                                  !hasDate ? "border-rule" : item.isCompleted ? "border-[#bbe3ca]" : "border-pru-red-line"
                                }`}
                              >
                                <span
                                  className={`block py-0.5 text-[10px] font-bold text-white uppercase ${
                                    !hasDate ? "bg-stone-400" : item.isCompleted ? "bg-done" : "bg-pru-red"
                                  }`}
                                >
                                  {hasDate ? mon : "Launch"}
                                </span>
                                <span className="block py-0.5 text-[17px] font-bold text-ink tabular-nums">
                                  {hasDate ? day : "TBC"}
                                </span>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <footer className="flex shrink-0 items-center justify-between border-t border-rule px-4 pt-3.5 pb-4 sm:px-7">
                <span className="text-sm text-ink-soft">
                  แสดง {modalDisplayedItems.length} จาก {modalItems.length} projects
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="touch-target inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Close
                </button>
              </footer>
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
        memberCounts={Object.fromEntries(
          Object.entries(memberStats).map(([name, st]) => [name, st.total])
        )}
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
