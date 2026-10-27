"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useProducts } from "@/hooks/use-products"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  ProductItem,
  getMonthsForYear,
  getSystemCurrentMonth,
} from "@/lib/timeline-data"
import { TimelineHeader, TimelineTrackHeader } from "./timeline-header"
import { TimelineRow, TimelineLegend } from "./timeline-row"
import { PruIcon } from "@/components/pru-icon"
import { thaiMonthLabel, THAI_MONTHS } from "./timeline-header"
import { TimelineMobileList } from "./timeline-mobile-list"
import { TimelineExportBoard } from "./timeline-export-board"
import { ChannelSummaryExportBoard } from "@/components/analytics/channel-summary-export-board"
import { ProductFormModal } from "./product-form-modal"
import { ProjectActionDialog, ProjectAction } from "./project-action-dialog"
import { BrokerColorModal } from "./broker-color-modal"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useChannelColors } from "@/hooks/use-channel-colors"
import { toPng } from "html-to-image"
import {
  uploadTimelineSnapshot,
  saveBothTimelineSnapshots,
} from "@/lib/supabase"
import { toast } from "@/lib/notify"
import {
  Plus,
  AlertCircle,
  ShieldCheck,
  Loader2,
  PauseCircle,
  PlayCircle,
  ChevronDown,
} from "lucide-react"

export function ProductTimeline() {
  const {
    timelineType,
    setTimelineType,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    availableYears,
    goToCurrentMonth,
    availableMonths,
    copyFromPreviousMonth,
    asOfText,
    setAsOfText,
    currentItems,
    currentProductItems,
    currentEnhancementItems,
    isLoaded,
    addProduct,
    updateProduct,
    pauseProduct,
    resumeProduct,
    deleteProductPermanently,
    pausedItems,
    monthlyStore,
    isCloudConnected,
    isSyncing,
    syncConflict,
    reloadFromCloud,
  } = useProducts()
  const [isReloading, setIsReloading] = useState(false)

  const { isAdmin } = useAdminAuth()
  const {
    teamMembers,
    addMember,
    updateMember,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers()

  const {
    colorMap,
    updateChannelColor: handleColorChange,
    addChannel: handleAddChannel,
    deleteChannel: handleDeleteChannel,
    resetToDefault: handleResetColors,
  } = useChannelColors(monthlyStore)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isColorModalOpen, setIsColorModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [isSendingLine, setIsSendingLine] = useState(false)

  const dashboardRef = useRef<HTMLDivElement>(null)
  const productExportRef = useRef<HTMLDivElement>(null)
  const enhancementExportRef = useRef<HTMLDivElement>(null)
  const channelSummaryExportRef = useRef<HTMLDivElement>(null)

  // Capture snapshots from offscreen 2K boards and upload to Supabase Storage
  const captureAndUploadSnapshots = useCallback(
    async (showUserAlert = false) => {
      if (!productExportRef.current || !enhancementExportRef.current) return
      try {
        if (showUserAlert) setIsSendingLine(true)

        // 1. Capture Product Image (width 1280, 2x retina)
        const productDataUrl = await toPng(productExportRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: 1280,
        })

        // 2. Capture Enhancement Image (width 1280, 2x retina)
        const enhancementDataUrl = await toPng(enhancementExportRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: 1280,
        })

        // 3. Capture Channel Summary Image (width 1200, 2x retina)
        let channelSummaryDataUrl: string | undefined = undefined
        if (channelSummaryExportRef.current) {
          channelSummaryDataUrl = await toPng(channelSummaryExportRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#FFFFFF",
            width: 1200,
          })
        }

        // 4. Upload all 3 images to Supabase Storage
        const uploadRes = await saveBothTimelineSnapshots(
          productDataUrl,
          enhancementDataUrl,
          selectedMonth,
          asOfText,
          channelSummaryDataUrl
        )

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || "ไม่สามารถอัปโหลดภาพได้")
        }

        if (showUserAlert) {
          toast.success(
            `อัปเดตรูปทั้ง 3 รูปของ ${selectedMonth} (${asOfText}) แล้ว\nพิมพ์ "CD รูป" ในกลุ่ม LINE เพื่อดูรูปชุดนี้`
          )
        } else {
          console.log("Auto-snapshot background sync completed successfully")
        }
      } catch (err: any) {
        console.error("Snapshot upload error:", err)
        if (showUserAlert) {
          toast.error("บันทึกรูปภาพไม่สำเร็จ: " + (err?.message || err))
        }
      } finally {
        if (showUserAlert) setIsSendingLine(false)
      }
    },
    [selectedMonth, asOfText]
  )

  // Annual Aggregate Data for the selected year (Summary by Channel of that specific year)
  const { annualProducts, annualEnhancements } = React.useMemo(() => {
    if (!monthlyStore) return { annualProducts: [], annualEnhancements: [] }

    const yearMonths = getMonthsForYear(selectedYear)
    const productMap = new Map<string, ProductItem>()
    const enhancementMap = new Map<string, ProductItem>()

    yearMonths.forEach((m) => {
      const mData = monthlyStore[m]
      if (!mData) return

      ;(mData.products || []).forEach((p) => {
        const key = `${p.name.trim().toLowerCase()}___${(p.broker || "").trim().toLowerCase()}`
        if (!productMap.has(key)) {
          productMap.set(key, p)
        }
      })

      ;(mData.enhancements || []).forEach((e) => {
        const key = `${e.name.trim().toLowerCase()}___${(e.broker || "").trim().toLowerCase()}`
        if (!enhancementMap.has(key)) {
          enhancementMap.set(key, e)
        }
      })
    })

    return {
      annualProducts: Array.from(productMap.values()),
      annualEnhancements: Array.from(enhancementMap.values()),
    }
  }, [monthlyStore, selectedYear])

  // Auto-Sync Snapshots in the background (debounced 2.5s) so the user NEVER needs to manually click save!
  // Admin only, current month only: the LINE bot always shows this calendar month,
  // so browsing an older month must not replace the images it sends
  const isViewingCurrentMonth = selectedMonth === getSystemCurrentMonth()
  useEffect(() => {
    if (!isAdmin || !isViewingCurrentMonth || !isLoaded || !monthlyStore) return

    const timer = setTimeout(() => {
      captureAndUploadSnapshots(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [
    isAdmin,
    isViewingCurrentMonth,
    monthlyStore,
    selectedMonth,
    asOfText,
    isLoaded,
    selectedYear,
    captureAndUploadSnapshots,
  ])

  // Collect all brokers used in products across all months to prevent accidental data loss warnings
  const allUsedBrokers = React.useMemo(() => {
    const list: string[] = []
    if (monthlyStore) {
      Object.values(monthlyStore).forEach((m) => {
        ;(m.products || []).forEach((p) => {
          if (p.broker) list.push(p.broker)
        })
        ;(m.enhancements || []).forEach((p) => {
          if (p.broker) list.push(p.broker)
        })
      })
    }
    return list
  }, [monthlyStore])

  const handleOpenAdd = () => {
    setProductToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: ProductItem) => {
    setProductToEdit(item)
    setIsModalOpen(true)
  }

  const handleSaveProduct = (data: Omit<ProductItem, "id">, id?: string) => {
    if (id) {
      updateProduct(id, data)
    } else {
      addProduct(data)
    }
    if (data.broker && !colorMap[data.broker]) {
      handleAddChannel(data.broker, "#7E1518")
    }
  }

  const [pendingAction, setPendingAction] = useState<ProjectAction | null>(null)

  // Summary cards: next target launch from today, and how many launch next month
  const monthSummary = React.useMemo(() => {
    const MONTHS = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ]
    const parse = (str?: string) => {
      if (!str || /tbc/i.test(str)) return null
      const lower = str.toLowerCase()
      const mIdx = MONTHS.findIndex((m) => lower.includes(m))
      if (mIdx < 0) return null
      const y = lower.match(/\b(20\d{2}|25\d{2})\b/)
      const year = y
        ? Number(y[0]) > 2400
          ? Number(y[0]) - 543
          : Number(y[0])
        : new Date().getFullYear()
      const d = lower.match(/\b(\d{1,2})\b/)
      return new Date(year, mIdx, d ? Number(d[0]) : 15)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    let next: { label: string; name: string; at: number } | null = null
    let nextMonthCount = 0
    currentItems.forEach((item) => {
      const date = parse(item.commercialDate)
      if (!date) return
      if (date >= today && (!next || date.getTime() < next.at)) {
        next = {
          label: `${date.getDate()} ${THAI_MONTHS[date.getMonth()].slice(0, 3)}.`,
          name: item.name.replace(/\n/g, " "),
          at: date.getTime(),
        }
      }
      if (
        date.getFullYear() === nextMonth.getFullYear() &&
        date.getMonth() === nextMonth.getMonth()
      )
        nextMonthCount += 1
    })
    return {
      next: next as { label: string; name: string } | null,
      nextMonthCount,
      nextMonthLabel: THAI_MONTHS[nextMonth.getMonth()],
    }
  }, [currentItems])
  const [isPausedListOpen, setIsPausedListOpen] = useState(false)

  const handleConfirmAction = (action: ProjectAction) => {
    if (action.type === "pause") pauseProduct(action.product.id)
    else if (action.type === "resume") resumeProduct(action.product.id)
    else deleteProductPermanently(action.product.id)
    setPendingAction(null)
  }

  const handleDeleteFromForm = (id: string) => {
    const product = currentItems.find((p) => p.id === id) || productToEdit
    if (product) setPendingAction({ type: "delete", product })
  }

  const handleAsOfChange = (text: string) => {
    setAsOfText(text)
  }

  // Clean Image Export (Completely Filters Out All Buttons)
  const handleExportAll = async () => {
    if (!dashboardRef.current) return
    try {
      setIsExportingAll(true)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const el = dashboardRef.current
      const exportWidth = Math.max(el.scrollWidth, 1200)

      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: exportWidth,
        filter: (node) => {
          if (node.classList && node.classList.contains("export-hide")) {
            return false
          }
          return true
        },
      })

      const link = document.createElement("a")
      const prefix =
        timelineType === "product"
          ? "Prudential-New-Product-Timeline"
          : "Prudential-Enhancement-Timeline"
      link.download = `${prefix}-${selectedMonth.replace(/\s+/g, "_")}-${asOfText.replace(
        /\s+/g,
        "_"
      )}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Failed to export dashboard image", err)
      toast.error("Export ภาพรวมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsExportingAll(false)
    }
  }

  const handleSendToLine = () => {
    if (!isViewingCurrentMonth) {
      toast.info(
        `บอท LINE แสดงเฉพาะเดือนปัจจุบัน (${getSystemCurrentMonth()})\nกดปุ่ม "เดือนปัจจุบัน" ก่อน แล้วค่อยส่งรูปเข้า LINE`
      )
      return
    }
    captureAndUploadSnapshots(true)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      <div ref={dashboardRef} className="flex flex-col gap-6 bg-paper sm:gap-8">
        {/* Timeline Header */}
        <TimelineHeader
          timelineType={timelineType}
          onTimelineTypeChange={setTimelineType}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
          onGoToCurrentMonth={goToCurrentMonth}
          availableMonths={availableMonths}
          asOfText={asOfText}
          onAsOfChange={handleAsOfChange}
          onAddClick={handleOpenAdd}
          onExportAllClick={handleExportAll}
          onOpenColorModal={() => setIsColorModalOpen(true)}
          onSendLineClick={handleSendToLine}
          isSendingLine={isSendingLine}
          isExporting={isExportingAll}
          isAdmin={isAdmin}
          isCloudConnected={isCloudConnected}
          isSyncing={isSyncing}
          itemCount={isLoaded ? currentItems.length : undefined}
        />

        {syncConflict && (
          <div
            role="alert"
            className="export-hide mt-3 flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                มีคนอื่นบันทึกข้อมูลไปก่อนหน้า การแก้ไขล่าสุดของคุณ
                <strong>ยังไม่ได้บันทึก</strong> กรุณาโหลดข้อมูลล่าสุด
                แล้วแก้อีกครั้ง
              </span>
            </div>
            <button
              type="button"
              disabled={isReloading}
              onClick={async () => {
                setIsReloading(true)
                try {
                  await reloadFromCloud()
                } finally {
                  setIsReloading(false)
                }
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {isReloading && <Loader2 className="h-4 w-4 animate-spin" />}
              โหลดข้อมูลล่าสุด
            </button>
          </div>
        )}

        {isLoaded && currentItems.length > 0 && (
          <section
            aria-label="ภาพรวมเดือนนี้"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
          >
            <div className="flex justify-between gap-4 border-2 border-rule bg-white px-6 py-5">
              <div>
                <div className="text-sm text-ink-soft">โครงการในเดือนนี้</div>
                <div className="text-[40px] leading-tight font-bold">
                  {currentItems.length}
                </div>
              </div>
              <PruIcon
                name="document"
                size={40}
                strokeWidth={3}
                className="text-pru-red"
              />
            </div>
            <div className="flex justify-between gap-4 border-2 border-rule bg-white px-6 py-5">
              <div className="min-w-0">
                <div className="text-sm text-ink-soft">Launch ถัดไป</div>
                {monthSummary.next ? (
                  <>
                    <div className="text-[28px] leading-snug font-bold text-pru-red">
                      {monthSummary.next.label}
                    </div>
                    <div
                      className="truncate text-sm"
                      title={monthSummary.next.name}
                    >
                      {monthSummary.next.name}
                    </div>
                  </>
                ) : (
                  <div className="text-[28px] leading-snug font-bold">—</div>
                )}
              </div>
              <PruIcon
                name="target"
                size={40}
                strokeWidth={3}
                className="shrink-0 text-pru-red"
              />
            </div>
            <div className="flex justify-between gap-4 border-2 border-rule bg-white px-6 py-5">
              <div>
                <div className="text-sm text-ink-soft">
                  รอ Launch ในเดือน{monthSummary.nextMonthLabel}
                </div>
                <div className="text-[40px] leading-tight font-bold">
                  {monthSummary.nextMonthCount}{" "}
                  <span className="text-base font-normal text-ink-soft">
                    โครงการ
                  </span>
                </div>
              </div>
              <PruIcon
                name="clock"
                size={40}
                strokeWidth={3}
                className="text-pru-red"
              />
            </div>
          </section>
        )}

        {/* Timeline table (desktop) / project cards (phones) */}
        <div className="md:overflow-x-auto md:border-2 md:border-rule md:bg-white">
          <div className="md:min-w-[1080px]">
            {/* Phase Track Column Header (Scrolls together with Rows); phones use cards instead */}
            <div className="hidden md:block">
              <TimelineTrackHeader timelineType={timelineType} />
            </div>

            {!isLoaded ? (
              /* Loading Skeleton / Spinner (Zero Flicker) */
              <div className="space-y-4 py-14 text-center">
                <div className="mx-auto inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-red-50 text-brand-ink">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-ink" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-gray-700">
                    กำลังเชื่อมต่อและโหลดข้อมูลจาก Cloud...
                  </p>
                  <p className="text-xs text-gray-500">
                    ดึงข้อมูลรอบเดือน {selectedMonth} จาก Supabase
                  </p>
                </div>
                {/* 3 Ghost Skeletons */}
                <div className="mx-auto max-w-2xl space-y-2 pt-2 opacity-60">
                  <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="my-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                <AlertCircle className="mx-auto mb-1.5 h-8 w-8 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-700">
                  ยังไม่มีข้อมูลใน{" "}
                  {timelineType === "product"
                    ? "New Product Timeline"
                    : "Enhancement Timeline"}{" "}
                  รอบเดือน ({selectedMonth})
                </h3>
                <p className="mt-0.5 mb-2 text-xs text-gray-500">
                  {isAdmin
                    ? "กดปุ่มด้านล่างเพื่อเริ่มเพิ่มข้อมูล หรือกดคัดลอกจากเดือนก่อนหน้า"
                    : "เข้าสู่โหมด Admin เพื่อเพิ่มข้อมูลในรอบเดือนนี้"}
                </p>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="export-hide inline-flex touch-target items-center gap-1.5 rounded-lg bg-brand-fill px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-brand-hover"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มข้อมูลรอบนี้
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="md:hidden">
                  <TimelineMobileList
                    items={currentItems}
                    timelineType={timelineType}
                    isAdmin={isAdmin}
                    colorMap={colorMap}
                    onEdit={handleOpenEdit}
                    onDelete={(product) =>
                      setPendingAction({ type: "delete", product })
                    }
                    onPause={(product) =>
                      setPendingAction({ type: "pause", product })
                    }
                    onResume={(product) =>
                      setPendingAction({ type: "resume", product })
                    }
                  />
                </div>
                <div className="hidden md:block">
                  {currentItems.map((item) => (
                    <TimelineRow
                      key={item.id}
                      product={item}
                      timelineType={timelineType}
                      isAdmin={isAdmin}
                      onEdit={handleOpenEdit}
                      onDelete={(product) =>
                        setPendingAction({ type: "delete", product })
                      }
                      onPause={(product) =>
                        setPendingAction({ type: "pause", product })
                      }
                      onResume={(product) =>
                        setPendingAction({ type: "resume", product })
                      }
                      customColorMap={colorMap}
                    />
                  ))}
                  <TimelineLegend />
                </div>
              </>
            )}

            {/* Projects paused in an earlier month: hidden from the timeline, listed here */}
            {isLoaded && pausedItems.length > 0 && (
              <div className="export-hide mt-4 border-2 border-dashed border-gray-300 bg-paper md:m-6 md:mt-2">
                <button
                  type="button"
                  onClick={() => setIsPausedListOpen((v) => !v)}
                  aria-expanded={isPausedListOpen}
                  className="flex touch-target w-full items-center justify-between gap-2 px-5 py-4 text-[15px] font-bold text-ink"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <PruIcon name="pause" size={22} className="text-ink-soft" />
                    งานที่หยุดชั่วคราว ({pausedItems.length})
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${isPausedListOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isPausedListOpen && (
                  <ul className="divide-y divide-slate-200 border-t border-slate-200">
                    {pausedItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-800">
                            {item.name.replace(/\n/g, " ")}
                          </div>
                          <div className="text-xs text-gray-500">
                            [{item.broker}] · {item.owner} · หยุดตั้งแต่{" "}
                            {item.pausedSince}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                type: "resume",
                                product: item,
                              })
                            }
                            className="inline-flex touch-target shrink-0 items-center gap-1.5 border-2 border-ink bg-white px-3 py-1.5 text-sm font-bold text-ink hover:bg-surface"
                          >
                            <PruIcon name="clock" size={16} />
                            ทำต่อ
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer (without tips) */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
          <div className="export-hide flex items-center gap-1">
            {isAdmin ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                <span>สิทธิ์ Admin: เปิดใช้งาน</span>
              </>
            ) : (
              <span>โหมดผู้ชม (Read-only)</span>
            )}
          </div>
          <div className="font-medium text-gray-500">
            Prudential Thailand • ฝ่ายพัฒนาหลักสูตร
          </div>
        </div>
      </div>

      {/* Redesigned Centered Shadcn Modal for Add/Edit */}
      {isModalOpen && (
        <ProductFormModal
          key={
            productToEdit
              ? `edit-${productToEdit.id}`
              : `add-${timelineType}-${selectedMonth}`
          }
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setProductToEdit(null)
          }}
          timelineType={timelineType}
          selectedMonth={selectedMonth}
          productToEdit={productToEdit}
          onSave={handleSaveProduct}
          onDelete={handleDeleteFromForm}
          teamMembers={teamMembers}
          availableBrokers={colorMap}
        />
      )}

      <ProjectActionDialog
        key={
          pendingAction
            ? `${pendingAction.type}-${pendingAction.product.id}`
            : "none"
        }
        action={pendingAction}
        selectedMonth={selectedMonth}
        onConfirm={handleConfirmAction}
        onClose={() => setPendingAction(null)}
      />

      {/* Broker Color Customizer Modal */}
      <BrokerColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        onColorChange={handleColorChange}
        onAddChannel={handleAddChannel}
        onDeleteChannel={handleDeleteChannel}
        onResetColors={handleResetColors}
        currentColors={colorMap}
        allProductsBrokers={allUsedBrokers}
      />

      {/* Hidden Off-Screen Container for Seamless 2K Auto-Snapshots without Screen Flickering.
          Only admins capture LINE images, so viewers skip rendering these boards. */}
      {isAdmin && (
        <div
          className="pointer-events-none fixed top-0 overflow-hidden select-none"
          style={{ left: "-99999px", width: "1280px", zIndex: -9999 }}
          aria-hidden="true"
        >
          <TimelineExportBoard
            ref={productExportRef}
            timelineType="product"
            selectedMonth={selectedMonth}
            asOfText={asOfText}
            items={currentProductItems}
            colorMap={colorMap}
          />
          <div style={{ height: "40px" }} />
          <TimelineExportBoard
            ref={enhancementExportRef}
            timelineType="enhancement"
            selectedMonth={selectedMonth}
            asOfText={asOfText}
            items={currentEnhancementItems}
            colorMap={colorMap}
          />
          <div style={{ height: "40px" }} />
          <ChannelSummaryExportBoard
            ref={channelSummaryExportRef}
            selectedPeriod={`ทั้งปี ${selectedYear + 543}`}
            isAnnual={true}
            products={annualProducts}
            enhancements={annualEnhancements}
            colorMap={colorMap}
          />
        </div>
      )}
    </div>
  )
}
