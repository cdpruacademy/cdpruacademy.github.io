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
import { TimelineHero } from "./timeline-header"
import { getProgress } from "./timeline-row"
import { TimelineTable, groupByPartner } from "./timeline-summary"
import { Icon } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { TimelineMobileList } from "./timeline-mobile-list"
import { NO_FILTERS, TimelineFilters, applyFilters } from "./timeline-filters"
import { TimelineExportBoard } from "./timeline-export-board"
import { ChannelSummaryExportBoard } from "@/components/analytics/channel-summary-export-board"
import { ProductFormModal } from "./product-form-modal"
import { ProjectActionDialog, ProjectAction } from "./project-action-dialog"
import { useTeamMembers } from "@/hooks/use-team-members"
import { usePartners } from "@/hooks/use-partners"
import { toPng } from "html-to-image"
import {
  uploadTimelineSnapshot,
  saveBothTimelineSnapshots,
} from "@/lib/supabase"
import { toast } from "@/lib/notify"
import { Loader2 } from "lucide-react"

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

  const { partners } = usePartners()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [isSendingLine, setIsSendingLine] = useState(false)
  const [filters, setFilters] = useState(NO_FILTERS)

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
            `ส่งรูป ${selectedMonth} (${asOfText}) แล้ว พิมพ์ "CODY รูป" ในกลุ่ม LINE เพื่อดู`
          )
        } else {
          console.log("Auto-snapshot background sync completed successfully")
        }
      } catch (err) {
        console.error("Snapshot upload error:", err)
        if (showUserAlert) {
          toast.error("บันทึกรูปภาพไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
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
  }

  const [pendingAction, setPendingAction] = useState<ProjectAction | null>(null)

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

  // "Save image" downloads the same board the LINE bot sends, so the file looks like the LINE image
  const handleExportAll = async () => {
    const el =
      timelineType === "product"
        ? productExportRef.current
        : enhancementExportRef.current
    if (!el) return
    try {
      setIsExportingAll(true)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F7F5F3",
        width: 1280,
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
      console.error("Failed to export timeline image", err)
      toast.error("บันทึกรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsExportingAll(false)
    }
  }

  const handleSendToLine = () => {
    if (!isViewingCurrentMonth) {
      toast.info(
        `ส่งเข้า LINE ได้เฉพาะเดือนปัจจุบัน (${getSystemCurrentMonth()}) กด "This month" ก่อน`
      )
      return
    }
    captureAndUploadSnapshots(true)
  }

  const groups = groupByPartner(currentItems, partners, timelineType)
  const shownItems = applyFilters(currentItems, filters, partners, timelineType)
  const completedCount = currentItems.filter(
    (i) => getProgress(i, timelineType).isFinished
  ).length
  const onHoldCount = currentItems.filter((i) => i.isPaused).length
  const rowHandlers = {
    onEdit: handleOpenEdit,
    onDelete: (product: ProductItem) =>
      setPendingAction({ type: "delete", product }),
    onPause: (product: ProductItem) =>
      setPendingAction({ type: "pause", product }),
    onResume: (product: ProductItem) =>
      setPendingAction({ type: "resume", product }),
  }

  return (
    <div ref={dashboardRef}>
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 pt-5 pb-12 sm:px-8 sm:pt-7">
        <TimelineHero
          timelineType={timelineType}
          onTimelineTypeChange={setTimelineType}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
          onGoToCurrentMonth={goToCurrentMonth}
          asOfText={asOfText}
          onAsOfChange={setAsOfText}
          counts={
            isLoaded
              ? {
                  total: currentItems.length,
                  completed: completedCount,
                  inProgress: currentItems.length - completedCount - onHoldCount,
                  onHold: onHoldCount,
                }
              : undefined
          }
          onAddClick={handleOpenAdd}
          onExportAllClick={handleExportAll}
          onSendLineClick={handleSendToLine}
          isSendingLine={isSendingLine}
          isExporting={isExportingAll}
          isAdmin={isAdmin}
          isCloudConnected={isCloudConnected}
          isSyncing={isSyncing}
        />

        {syncConflict && (
          <div
            role="alert"
            className={`${card} flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center`}
          >
            <div className="flex items-start gap-2.5 text-sm text-ink">
              <Icon
                name="warning"
                size={20}
                className="mt-0.5 shrink-0 text-brand-ink"
              />
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
              className={cardButton}
            >
              {isReloading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reload latest data
            </button>
          </div>
        )}

        {!isLoaded ? (
          <div
            className={`${card} flex flex-col items-center gap-3 py-16 text-center`}
          >
            <Loader2 className="h-7 w-7 animate-spin text-brand-ink" />
            <p className="text-sm font-semibold text-ink">
              กำลังโหลดข้อมูลจาก Cloud…
            </p>
          </div>
        ) : currentItems.length === 0 ? (
          <div
            className={`${card} flex flex-col items-center gap-3 px-6 py-14 text-center`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-ink-soft">
              <Icon name="folder" size={28} />
            </span>
            <h2 className="text-lg font-bold">No projects in {selectedMonth}</h2>
            <p className="text-sm text-ink-soft">
              {isAdmin
                ? "เพิ่ม project แรกของเดือนนี้ได้เลย"
                : "เข้าสู่ระบบ Admin เพื่อเพิ่ม project ในเดือนนี้"}
            </p>
            {isAdmin && (
              <button type="button" onClick={handleOpenAdd} className={cardButton}>
                <Icon name="plus" size={18} />
                Add project
              </button>
            )}
          </div>
        ) : (
          <>
            <TimelineFilters
              filters={filters}
              onChange={setFilters}
              groups={groups}
              items={currentItems}
              timelineType={timelineType}
              shown={shownItems.length}
            />
            {shownItems.length === 0 ? (
              <div
                className={`${card} flex flex-col items-center gap-3 px-6 py-12 text-center`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-ink-soft">
                  <Icon name="search" size={28} />
                </span>
                <h2 className="text-lg font-bold">No matching projects</h2>
                <p className="text-sm text-ink-soft">
                  ลองเปลี่ยนคำค้นหรือตัวกรอง
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(NO_FILTERS)}
                  className={cardButton}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="md:hidden">
                  <TimelineMobileList
                    items={shownItems}
                    timelineType={timelineType}
                    isAdmin={isAdmin}
                    partners={partners}
                    {...rowHandlers}
                  />
                </div>
                <section className={`${card} hidden overflow-hidden md:block`}>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1160px]">
                      <TimelineTable
                        items={shownItems}
                        timelineType={timelineType}
                        partners={partners}
                        isAdmin={isAdmin}
                        {...rowHandlers}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* Projects on hold since an earlier month: hidden from the timeline, listed here */}
        {isLoaded && pausedItems.length > 0 && (
          <section className={`${card} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setIsPausedListOpen((v) => !v)}
              aria-expanded={isPausedListOpen}
              className="flex touch-target w-full items-center justify-between gap-2 px-5 py-4 text-[15px] font-semibold text-ink"
            >
              <span className="inline-flex items-center gap-2.5">
                <Icon name="onHold" size={20} className="text-ink-soft" />
                On hold ({pausedItems.length})
              </span>
              <Icon
                name="chevronDown"
                size={18}
                className={`text-ink-soft transition-transform ${isPausedListOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isPausedListOpen && (
              <ul className="divide-y divide-surface border-t border-surface">
                {pausedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">
                        {item.name.replace(/\n/g, " ")}
                      </div>
                      <div className="text-xs text-ink-soft">
                        {item.broker} · {item.owner} · On hold since{" "}
                        {item.pausedSince}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ type: "resume", product: item })
                        }
                        className={cardButton}
                      >
                        <Icon name="refresh" size={16} />
                        Resume
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="flex items-center justify-between pt-2 text-xs text-ink-soft">
          <span>{isAdmin ? "Admin mode" : "View only"}</span>
          <span>Prudential Thailand · ฝ่ายพัฒนาหลักสูตร</span>
        </footer>
      </div>

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
          partners={partners}
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

      {/* Off-screen boards: the LINE images, also what "Save image" downloads */}
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
          partners={partners}
        />
        <div style={{ height: "40px" }} />
        <TimelineExportBoard
          ref={enhancementExportRef}
          timelineType="enhancement"
          selectedMonth={selectedMonth}
          asOfText={asOfText}
          items={currentEnhancementItems}
          partners={partners}
        />
        <div style={{ height: "40px" }} />
        {isAdmin && (
          <ChannelSummaryExportBoard
            ref={channelSummaryExportRef}
            selectedPeriod={`ทั้งปี ${selectedYear + 543}`}
            isAnnual={true}
            products={annualProducts}
            enhancements={annualEnhancements}
            partners={partners}
          />
        )}
      </div>
    </div>
  )
}
