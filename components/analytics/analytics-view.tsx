"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useProducts } from "@/hooks/use-products"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useTeamMembers } from "@/hooks/use-team-members"
import { DonutChart, DonutChartSegment } from "@/components/ui/donut-chart"
import { TeamManagementModal } from "@/components/dashboard/team-management-modal"
import { AdminLoginModal } from "@/components/auth/admin-login-modal"
import {
  ProductItem,
  PhaseKey,
  getMonthsForYear,
  MONTH_NAMES,
  parseMonthYear,
  getSystemCurrentMonth,
  checkIsProjectCompleted,
  getDefaultAsOf,
} from "@/lib/timeline-data"
import { buildMonthlyReport, collectReportData, ReportImage } from "@/lib/report-slides"
import { buildLaunchCalendar } from "@/lib/calendar"
import { TimelineExportBoard } from "@/components/dashboard/timeline-export-board"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { toPng } from "html-to-image"

import { usePartners } from "@/hooks/use-partners"
import { UNASSIGNED_PARTNER, partnerOf } from "@/lib/partners"
import { Icon } from "@/components/icon"
import { PickMenu } from "@/components/ui/pick-menu"
import {
  PageBody,
  PageHero,
  card,
  cardButton,
  cardButtonDark,
  heroButton,
  heroButtonSolid,
} from "@/components/page-hero"
import { updateChannelSummarySnapshot } from "@/lib/supabase"
import { toast } from "@/lib/notify"
import { subscribeToStoreRow } from "@/lib/supabase"
import { ChannelSummaryExportBoard } from "./channel-summary-export-board"
import { OwnerDialog, OwnerItem } from "./owner-dialog"
import {
  getYearProjects,
  refresherToItem,
  YearProject,
} from "@/lib/team-metrics"
import {
  Refresher,
  fetchRefreshers,
  refresherMonthIndex,
} from "@/lib/difficulty"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface AggregatedItem extends ProductItem {
  activeMonths?: string[]
  refresher?: Refresher
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
  const { role, isAdmin, login } = useAdminAuth()
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

  // Type filter: All vs New Product vs Enhancement
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    "all" | "product" | "enhancement" | "refresher"
  >("all")

  // Refresher lessons are not on the Timeline; anyone signed in can read them
  const signedIn = role !== null
  const [refreshers, setRefreshers] = useState<Refresher[]>([])
  const [refreshersFailed, setRefreshersFailed] = useState(false)
  useEffect(() => {
    if (!signedIn) return
    let alive = true
    const load = () => {
      fetchRefreshers().then((list) => {
        if (!alive) return
        if (list) setRefreshers(list)
        setRefreshersFailed(list === null)
      })
    }
    load()
    const unsubscribe = subscribeToStoreRow("refreshers", load)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [signedIn])

  // The owner box whose popup is open; member null is the whole team
  const [ownerPopup, setOwnerPopup] = useState<{ member: string | null } | null>(null)

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
        `อัปเดตรูปสรุปช่องทาง (${periodLabel}) แล้ว`
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

  // Monthly report slides: the selected month, or this month on the whole-year view
  const thisMonth = getSystemCurrentMonth()
  const reportMonth = isAnnual
    ? yearMonths.includes(thisMonth)
      ? thisMonth
      : yearMonths[yearMonths.length - 1]
    : selectedPeriod
  const [slideMonth, setSlideMonth] = useState<string | null>(null)
  const slideAsOf = slideMonth
    ? monthlyStore?.[slideMonth]?.asOfText || getDefaultAsOf(slideMonth)
    : ""
  const slidePartnerRef = React.useRef<HTMLDivElement>(null)
  const slideProductRef = React.useRef<HTMLDivElement>(null)
  const slideEnhancementRef = React.useRef<HTMLDivElement>(null)

  const handleMakeSlides = async () => {
    if (!monthlyStore || !getItemsForMonth || slideMonth) return
    const month = reportMonth
    const asOfText = monthlyStore[month]?.asOfText || getDefaultAsOf(month)
    try {
      // Render the month's boards off-screen, then capture them like the LINE images
      setSlideMonth(month)
      await new Promise((resolve) => setTimeout(resolve, 400))
      const shots: [HTMLDivElement | null, number, string][] = [
        [slidePartnerRef.current, 1200, "สรุปตาม partner"],
        [slideProductRef.current, 1280, "Timeline · New Product"],
        [slideEnhancementRef.current, 1280, "Timeline · Enhancement"],
      ]
      const images: ReportImage[] = []
      for (const [el, width, title] of shots) {
        if (!el) continue
        const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2, backgroundColor: "#FFFFFF", width })
        images.push({ dataUrl, width: el.offsetWidth, height: el.offsetHeight, title })
      }
      const logo = await fetch(`${BASE_PATH}/prudential-logo-th.png`)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result))
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
        )
      const data = collectReportData(monthlyStore, month, getItemsForMonth, asOfText)
      await buildMonthlyReport({ ...data, images }, logo)
    } catch (err) {
      console.error("Monthly slides error:", err)
      toast.error(
        "สร้างสไลด์ไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setSlideMonth(null)
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

    // Annual Scope: one entry per project id, the same list the year comparison uses
    const yearProjects = getYearProjects(monthlyStore, activeYear)
    const ofType = (type: YearProject["type"]): AggregatedItem[] =>
      yearProjects
        .filter((p) => p.type === type)
        .map((p) => ({ ...p.item, activeMonths: p.months }))

    return {
      rawProducts: ofType("product"),
      rawEnhancements: ofType("enhancement"),
    }
  }, [monthlyStore, activeYear, isAnnual, selectedPeriod])

  // A Refresher counts in the last month of its quarter, as it does on the KPI page
  const refreshersOfMonth = (monthIndex: number) =>
    refreshers.filter(
      (r) => r.year === activeYear && refresherMonthIndex(r) === monthIndex
    )

  const rawRefreshers = useMemo<AggregatedItem[]>(() => {
    const period = isAnnual ? null : parseMonthYear(selectedPeriod)
    return refreshers
      .filter(
        (r) =>
          r.year === activeYear &&
          (!period || refresherMonthIndex(r) === period.monthIndex)
      )
      .map(refresherToItem)
  }, [refreshers, activeYear, isAnnual, selectedPeriod])

  // Total Unique Projects in this scope (Unfiltered by member)
  const rawUniqueProjectsCount =
    rawProducts.length + rawEnhancements.length + rawRefreshers.length

  // Count co-owned projects
  const coOwnedProjectsCount = useMemo(() => {
    return [...rawProducts, ...rawEnhancements, ...rawRefreshers].filter((i) =>
      isItemCoOwned(i.owner)
    ).length
  }, [rawProducts, rawEnhancements, rawRefreshers])

  const products = rawProducts
  const enhancements = rawEnhancements
  const refresherItems = rawRefreshers

  // Monthly stats for the Trend Bar (strictly 12 months of activeYear, includes cross-month carryovers)
  const monthlyStats = useMemo(() => {
    if (!monthlyStore) return []
    return yearMonths.map((m, monthIndex) => {
      const pItems = getItemsForMonth
        ? getItemsForMonth(m, "product")
        : monthlyStore[m]?.products || []
      const eItems = getItemsForMonth
        ? getItemsForMonth(m, "enhancement")
        : monthlyStore[m]?.enhancements || []

      const pList = pItems
      const eList = eItems

      const pausedCount = [...pList, ...eList].filter((i) => i.isPaused).length
      const productsCount = pList.filter((i) => !i.isPaused).length
      const enhancementsCount = eList.filter((i) => !i.isPaused).length
      const refreshersCount = refreshersOfMonth(monthIndex).length
      return {
        month: m,
        productsCount,
        enhancementsCount,
        refreshersCount,
        pausedCount,
        totalCount: productsCount + enhancementsCount + refreshersCount + pausedCount,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyStore, yearMonths, getItemsForMonth, refreshers])

  // 3. Filtered by type (Product vs Enhancement vs All)
  const activeItems = useMemo(() => {
    if (selectedTypeFilter === "product") return products
    if (selectedTypeFilter === "enhancement") return enhancements
    if (selectedTypeFilter === "refresher") return refresherItems
    return [...products, ...enhancements, ...refresherItems]
  }, [products, enhancements, refresherItems, selectedTypeFilter])

  // Helper to build status detail for each item
  const buildItemStatus = (item: AggregatedItem) => {
    const isCompleted = checkIsProjectCompleted(item, selectedPeriod)
    const isPaused = !isCompleted && Boolean(item.isPaused)

    let currentPhaseLabel = isCompleted ? "Completed" : "Kick-off"
    let currentPhaseKey = isCompleted ? "launch" : "kick-off"
    if (isPaused) {
      currentPhaseLabel = item.pausedSince ? `On hold since ${item.pausedSince}` : "On hold"
    } else if (!isCompleted && item.refresher) {
      currentPhaseLabel = "In progress"
      currentPhaseKey = "refresher"
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

  // Compared with the year before, on the whole year only
  const yearCompare = useMemo(() => {
    if (!monthlyStore || !isAnnual) return null
    const keep = (p: YearProject) => selectedTypeFilter === "all" || p.type === selectedTypeFilter
    const ofYear = (year: number): YearProject[] => [
      ...getYearProjects(monthlyStore, year),
      ...refreshers
        .filter((r) => r.year === year)
        .map((r) => ({
          item: refresherToItem(r),
          type: "refresher" as const,
          completed: r.done,
          months: [],
        })),
    ]
    const prev = ofYear(activeYear - 1).filter(keep)
    if (prev.length === 0) return null
    const now = ofYear(activeYear).filter(keep)
    const count = (list: YearProject[]) => ({
      total: list.length,
      completed: list.filter((p) => p.completed).length,
      product: list.filter((p) => p.type === "product").length,
      enhancement: list.filter((p) => p.type === "enhancement").length,
      refresher: list.filter((p) => p.type === "refresher").length,
    })
    return { now: count(now), prev: count(prev) }
  }, [monthlyStore, isAnnual, activeYear, selectedTypeFilter, refreshers])

  // Launch and Internal Training dates as an .ics file for Outlook (follows the filters)
  const handleDownloadCalendar = () => {
    const typed = [
      ...(selectedTypeFilter === "all" || selectedTypeFilter === "product" ? products.map((item) => ({ item, type: "product" as const })) : []),
      ...(selectedTypeFilter === "all" || selectedTypeFilter === "enhancement" ? enhancements.map((item) => ({ item, type: "enhancement" as const })) : []),
    ]
    const period = isAnnual ? String(activeYear) : selectedPeriod
    const { ics, count } = buildLaunchCalendar(typed, `CD Team · ${period}`)
    if (count === 0) {
      toast.error("ไม่มีวัน launch ในช่วงนี้")
      return
    }
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }))
    const link = document.createElement("a")
    link.download = `CD-Team-Launch_${period.replace(/\s+/g, "-")}.ics`
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Total KPIs (paused projects still count: the team did work on them this year)
  const totalProjects = products.length + enhancements.length + refresherItems.length
  const newProductCount = products.length
  const enhancementCount = enhancements.length
  const refresherCount = refresherItems.length

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
  const allTeamItemsWithStatus = useMemo((): OwnerItem[] => {
    const tagged = <T extends AggregatedItem>(list: T[], type: OwnerItem["type"]) =>
      list.map((item) => ({ ...buildItemStatus(item), type }))
    return [
      ...tagged(rawProducts, "product"),
      ...tagged(rawEnhancements, "enhancement"),
      ...tagged(rawRefreshers, "refresher"),
    ]
  }, [rawProducts, rawEnhancements, rawRefreshers])

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

  // Team workload chart
  const memberSegments: DonutChartSegment[] = useMemo(
    () =>
      teamMembers.map((member) => ({
        label: member,
        value: memberStats[member]?.total || 0,
        color: memberColors[member] || "#ED1B2E",
      })),
    [teamMembers, memberStats, memberColors]
  )

  const totalMemberWorkload = memberSegments.reduce((s, m) => s + m.value, 0)
  const activeHoveredMember = memberSegments.find(
    (s) => s.label === hoveredMember
  )
  const displayMemberVal = activeHoveredMember?.value ?? totalMemberWorkload
  // Signed out: ask to log in
  if (!signedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className={`${card} flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
            <Icon name="lock" size={28} />
          </span>
          <h2 className="text-lg font-bold">เข้าสู่ระบบเพื่อดูหน้านี้</h2>
          <div className="flex flex-wrap justify-center gap-2.5 pt-1">
            <button type="button" onClick={() => setIsLoginModalOpen(true)} className={cardButtonDark}>
              Log in
            </button>
            <Link href="/" className={cardButton}>
              Back to Timeline
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
              {isAdmin && (
                <button type="button" onClick={() => setIsTeamModalOpen(true)} className={heroButton}>
                  <Icon name="team" size={18} />
                  Team ({teamMembers.length})
                </button>
              )}
              <button type="button" onClick={handleDownloadCalendar} className={heroButton}>
                <Icon name="calendar" size={18} />
                Calendar
              </button>
              <button type="button" onClick={handleMakeSlides} disabled={!!slideMonth} className={heroButton}>
                {slideMonth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="download" size={18} />}
                {slideMonth ? "Making slides…" : `Slides ${reportMonth}`}
              </button>
              {isAdmin && (
                <button type="button" onClick={handleSendToLine} disabled={isSendingLine} className={heroButton}>
                  {isSendingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={18} />}
                  {isSendingLine ? "Sending…" : "Send to LINE"}
                </button>
              )}
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
        {/* Owners: one box per person; choosing one shows their projects underneath */}
        <section aria-label="View by owner" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:col-span-12 lg:grid-cols-5">
          {[null, ...teamMembers].map((member) => {
            const color = member ? memberColors[member] || "#57534E" : "#1C1917"
            const stat = member
              ? memberStats[member] || { total: 0, completed: 0, pending: 0, paused: 0 }
              : {
                  total: rawUniqueProjectsCount,
                  completed: allTeamCompletedCount,
                  pending: allTeamPendingCount,
                  paused: allTeamPausedCount,
                }
            const share = (n: number) => (stat.total ? `${(n / stat.total) * 100}%` : "0%")
            return (
              <button
                key={member || "ALL_TEAM"}
                type="button"
                onClick={() => setOwnerPopup({ member })}
                aria-haspopup="dialog"
                className={`${card} flex min-w-0 flex-col gap-3 border-2 border-transparent p-4 text-left transition-colors hover:border-rule ${member ? "" : "col-span-2 md:col-span-1"}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: color }}
                  >
                    {member ? member.split(" ").map((w) => w[0]).join("") : <Icon name="team" size={20} />}
                  </span>
                  <span className="truncate text-[15px] font-semibold">{member || "Whole team"}</span>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[40px] leading-none font-bold tabular-nums">{stat.total}</span>
                  <span className="text-[13px] text-ink-soft">projects</span>
                </span>
                <span className="flex h-2 overflow-hidden rounded-full bg-rule" aria-hidden="true">
                  <span className="bg-done" style={{ width: share(stat.completed) }} />
                  <span className="bg-pru-red" style={{ width: share(stat.pending) }} />
                  <span className="bg-ink-soft" style={{ width: share(stat.paused) }} />
                </span>
                <span className="flex flex-wrap justify-between gap-x-2 text-[13px] font-semibold">
                  <span className="text-done">{stat.completed} done</span>
                  <span className="text-brand-ink">{stat.pending} open</span>
                </span>
              </button>
            )
          })}
        </section>

        {refreshersFailed && (
          <div role="alert" className="flex items-center gap-2.5 rounded-xl bg-pru-red-soft px-4 py-3 text-sm font-semibold text-brand-ink lg:col-span-12">
            <Icon name="info" size={18} className="shrink-0" />
            อ่านข้อมูล Refresher ไม่สำเร็จ ตัวเลขในหน้านี้ยังไม่รวม Refresher กรุณารีโหลดหน้า
          </div>
        )}

        {/* Compared with last year */}
        {yearCompare && (
          <section className={`${kpiCard} lg:col-span-12`}>
            <span className="text-sm font-semibold text-ink-soft">
              {activeYear} vs {activeYear - 1}
            </span>
            {([
              ["Completed", "completed"],
              ["All projects", "total"],
              ["New Product", "product"],
              ["Enhancement", "enhancement"],
              ["Refresher", "refresher"],
            ] as const).map(([label, key]) => {
              const diff = yearCompare.now[key] - yearCompare.prev[key]
              return (
                <div key={key} className="flex items-baseline justify-between gap-2 border-b border-surface pb-1.5 text-sm">
                  <span>{label}</span>
                  <span className="flex items-baseline gap-2">
                    <b className="text-base">{yearCompare.now[key]}</b>
                    <span className="text-xs text-ink-soft">from {yearCompare.prev[key]}</span>
                    {diff !== 0 && (
                      <span className={`text-xs font-bold ${diff > 0 ? "text-done" : "text-brand-ink"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </section>
        )}

        {/* Projects per month */}
        <section className={`${card} flex flex-col gap-4 p-6 lg:col-span-12`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2.5 text-[17px] font-bold">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
                  <Icon name="chart" size={18} />
                </span>
                Projects per month · {activeYear}
              </h2>
              <p className="mt-1 text-xs text-ink-soft">project ที่ทำข้ามเดือน นับทุกเดือน</p>
            </div>
            <span className="flex gap-4 text-[13px]">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-pru-red" />New Product</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-enhancement" />Enhancement</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-ink" />Refresher</span>
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
                        <span className="bg-ink" style={{ height: h(stat.refreshersCount) }} />
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
        </section>

        {/* Type filter */}
        <div className="flex w-fit gap-0.5 rounded-full bg-rule p-1 lg:col-span-12">
          {[
            { v: "all" as const, label: `All (${totalProjects})`, dot: "" },
            { v: "product" as const, label: `New Product (${newProductCount})`, dot: "bg-pru-red" },
            { v: "enhancement" as const, label: `Enhancement (${enhancementCount})`, dot: "bg-enhancement" },
            { v: "refresher" as const, label: `Refresher (${refresherCount})`, dot: "bg-ink" },
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
              Team workload
            </h2>
            <button type="button" onClick={() => setOwnerPopup({ member: null })} className={cardButton}>
              <Icon name="external" size={16} />
              Open list
            </button>
          </div>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <button
              type="button"
              className="shrink-0"
              onClick={() => setOwnerPopup({ member: null })}
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
                      {activeHoveredMember?.label ?? "Assignments"}
                    </span>
                    <span className="text-3xl leading-tight font-bold">{displayMemberVal}</span>
                    {totalMemberWorkload > 0 && (
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
                    onClick={() => isTeamMember && setOwnerPopup({ member: segment.label })}
                    onMouseEnter={() => setHoveredMember(segment.label)}
                    onMouseLeave={() => setHoveredMember(null)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_40px_44px] items-center gap-2 border-b border-surface py-2 text-left text-sm ${hoveredMember === segment.label ? "bg-surface" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: segment.color }} />
                      <b className="truncate">{segment.label}</b>
                      {mStat && mStat.shared > 0 && (
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
          {coOwnedProjectsCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-paper px-3 py-2.5 text-xs text-ink">
              <Icon name="info" size={18} className="shrink-0" />
              <span>
                project ที่มีผู้รับผิดชอบ 2 คน นับให้ทั้งสองคน
              </span>
            </div>
          )}
        </section>
      </PageBody>

      {ownerPopup && (
        <OwnerDialog
          key={ownerPopup.member || "ALL_TEAM"}
          member={ownerPopup.member}
          color={ownerPopup.member ? memberColors[ownerPopup.member] || "#57534E" : "#1C1917"}
          items={
            ownerPopup.member
              ? allTeamItemsWithStatus.filter((i) => isOwnerMatch(i.owner, ownerPopup.member as string))
              : allTeamItemsWithStatus
          }
          partners={partners}
          onClose={() => setOwnerPopup(null)}
        />
      )}


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
        {/* Images for the monthly slides, only while they are being made */}
        {slideMonth && getItemsForMonth && (
          <>
            <ChannelSummaryExportBoard
              ref={slidePartnerRef}
              selectedPeriod={slideMonth}
              isAnnual={false}
              products={getItemsForMonth(slideMonth, "product")}
              enhancements={getItemsForMonth(slideMonth, "enhancement")}
              partners={partners}
            />
            <TimelineExportBoard
              ref={slideProductRef}
              timelineType="product"
              selectedMonth={slideMonth}
              asOfText={slideAsOf}
              items={getItemsForMonth(slideMonth, "product")}
              partners={partners}
            />
            <TimelineExportBoard
              ref={slideEnhancementRef}
              timelineType="enhancement"
              selectedMonth={slideMonth}
              asOfText={slideAsOf}
              items={getItemsForMonth(slideMonth, "enhancement")}
              partners={partners}
            />
          </>
        )}
      </div>
    </div>
  )
}
