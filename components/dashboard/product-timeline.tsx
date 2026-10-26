"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useProducts } from "@/hooks/use-products";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { ProductItem, getMonthsForYear, getSystemCurrentMonth } from "@/lib/timeline-data";
import { TimelineHeader, TimelineTrackHeader } from "./timeline-header";
import { TimelineRow } from "./timeline-row";
import { TimelineExportBoard } from "./timeline-export-board";
import { ChannelSummaryExportBoard } from "@/components/analytics/channel-summary-export-board";
import { ProductFormModal } from "./product-form-modal";
import { ProjectActionDialog, ProjectAction } from "./project-action-dialog";
import { BrokerColorModal } from "./broker-color-modal";
import { useTeamMembers } from "@/hooks/use-team-members";
import { useChannelColors } from "@/hooks/use-channel-colors";
import { toPng } from "html-to-image";
import { uploadTimelineSnapshot, saveBothTimelineSnapshots } from "@/lib/supabase";
import { Plus, AlertCircle, ShieldCheck, Loader2, PauseCircle, PlayCircle, ChevronDown } from "lucide-react";

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
    resetToDefault,
    exportExcel,
    exportJSON,
    monthlyStore,
    isCloudConnected,
    isSyncing,
    syncConflict,
    reloadFromCloud,
  } = useProducts();
  const [isReloading, setIsReloading] = useState(false);

  const { isAdmin } = useAdminAuth();
  const {
    teamMembers,
    addMember,
    updateMember,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers();

  const {
    colorMap,
    updateChannelColor: handleColorChange,
    addChannel: handleAddChannel,
    deleteChannel: handleDeleteChannel,
    resetToDefault: handleResetColors,
  } = useChannelColors(monthlyStore);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isSendingLine, setIsSendingLine] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const productExportRef = useRef<HTMLDivElement>(null);
  const enhancementExportRef = useRef<HTMLDivElement>(null);
  const channelSummaryExportRef = useRef<HTMLDivElement>(null);

  // Capture snapshots from offscreen 2K boards and upload to Supabase Storage
  const captureAndUploadSnapshots = useCallback(
    async (showUserAlert = false) => {
      if (!productExportRef.current || !enhancementExportRef.current) return;
      try {
        if (showUserAlert) setIsSendingLine(true);

        // 1. Capture Product Image (width 1280, 2x retina)
        const productDataUrl = await toPng(productExportRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: 1280,
        });

        // 2. Capture Enhancement Image (width 1280, 2x retina)
        const enhancementDataUrl = await toPng(enhancementExportRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: 1280,
        });

        // 3. Capture Channel Summary Image (width 1200, 2x retina)
        let channelSummaryDataUrl: string | undefined = undefined;
        if (channelSummaryExportRef.current) {
          channelSummaryDataUrl = await toPng(channelSummaryExportRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#FFFFFF",
            width: 1200,
          });
        }

        // 4. Upload all 3 images to Supabase Storage
        const uploadRes = await saveBothTimelineSnapshots(
          productDataUrl,
          enhancementDataUrl,
          selectedMonth,
          asOfText,
          channelSummaryDataUrl
        );

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || "ไม่สามารถอัปโหลดภาพได้");
        }

        if (showUserAlert) {
          alert(
            `✅ อัปเดตรูปไทม์ไลน์และสรุปช่องทางขึ้น Cloud สำเร็จครบทั้ง 3 รูป!\n\n` +
            `• 🎯 New Product Timeline: บันทึกเรียบร้อย\n` +
            `• ⚡ Enhancement Timeline: บันทึกเรียบร้อย\n` +
            `• 📊 Channel Summary: บันทึกเรียบร้อย\n` +
            `• รอบเดือน: ${selectedMonth} (${asOfText})\n\n` +
            `สมาชิกใน LINE สามารถพิมพ์ "CD รูป" เพื่อรับภาพสรุปทั้ง 3 รูปได้ทันทีครับ`
          );
        } else {
          console.log("Auto-snapshot background sync completed successfully");
        }
      } catch (err: any) {
        console.error("Snapshot upload error:", err);
        if (showUserAlert) {
          alert("เกิดข้อผิดพลาดในการบันทึกรูปภาพ: " + (err?.message || err));
        }
      } finally {
        if (showUserAlert) setIsSendingLine(false);
      }
    },
    [selectedMonth, asOfText]
  );

  // Annual Aggregate Data for the selected year (Summary by Channel of that specific year)
  const { annualProducts, annualEnhancements } = React.useMemo(() => {
    if (!monthlyStore) return { annualProducts: [], annualEnhancements: [] };

    const yearMonths = getMonthsForYear(selectedYear);
    const productMap = new Map<string, ProductItem>();
    const enhancementMap = new Map<string, ProductItem>();

    yearMonths.forEach((m) => {
      const mData = monthlyStore[m];
      if (!mData) return;

      (mData.products || []).forEach((p) => {
        const key = `${p.name.trim().toLowerCase()}___${(p.broker || "").trim().toLowerCase()}`;
        if (!productMap.has(key)) {
          productMap.set(key, p);
        }
      });

      (mData.enhancements || []).forEach((e) => {
        const key = `${e.name.trim().toLowerCase()}___${(e.broker || "").trim().toLowerCase()}`;
        if (!enhancementMap.has(key)) {
          enhancementMap.set(key, e);
        }
      });
    });

    return {
      annualProducts: Array.from(productMap.values()),
      annualEnhancements: Array.from(enhancementMap.values()),
    };
  }, [monthlyStore, selectedYear]);

  // Auto-Sync Snapshots in the background (debounced 2.5s) so the user NEVER needs to manually click save!
  // Admin only, current month only: the LINE bot always shows this calendar month,
  // so browsing an older month must not replace the images it sends
  const isViewingCurrentMonth = selectedMonth === getSystemCurrentMonth();
  useEffect(() => {
    if (!isAdmin || !isViewingCurrentMonth || !isLoaded || !monthlyStore) return;

    const timer = setTimeout(() => {
      captureAndUploadSnapshots(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAdmin, isViewingCurrentMonth, monthlyStore, selectedMonth, asOfText, isLoaded, selectedYear, captureAndUploadSnapshots]);

  // Collect all brokers used in products across all months to prevent accidental data loss warnings
  const allUsedBrokers = React.useMemo(() => {
    const list: string[] = [];
    if (monthlyStore) {
      Object.values(monthlyStore).forEach((m) => {
        (m.products || []).forEach((p) => { if (p.broker) list.push(p.broker); });
        (m.enhancements || []).forEach((p) => { if (p.broker) list.push(p.broker); });
      });
    }
    return list;
  }, [monthlyStore]);

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProductItem) => {
    setProductToEdit(item);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (data: Omit<ProductItem, "id">, id?: string) => {
    if (id) {
      updateProduct(id, data);
    } else {
      addProduct(data);
    }
    if (data.broker && !colorMap[data.broker]) {
      handleAddChannel(data.broker, "#7E1518");
    }
  };

  const [pendingAction, setPendingAction] = useState<ProjectAction | null>(null);
  const [isPausedListOpen, setIsPausedListOpen] = useState(false);

  const handleConfirmAction = (action: ProjectAction) => {
    if (action.type === "pause") pauseProduct(action.product.id);
    else if (action.type === "resume") resumeProduct(action.product.id);
    else deleteProductPermanently(action.product.id);
    setPendingAction(null);
  };

  const handleDeleteFromForm = (id: string) => {
    const product = currentItems.find((p) => p.id === id) || productToEdit;
    if (product) setPendingAction({ type: "delete", product });
  };

  const handleAsOfChange = (text: string) => {
    setAsOfText(text);
  };

  const handleResetDefault = () => {
    resetToDefault();
  };

  // Clean Image Export (Completely Filters Out All Buttons)
  const handleExportAll = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsExportingAll(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const el = dashboardRef.current;
      const exportWidth = Math.max(el.scrollWidth, 1200);

      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: exportWidth,
        filter: (node) => {
          if (node.classList && node.classList.contains("export-hide")) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      const prefix =
        timelineType === "product"
          ? "Prudential-New-Product-Timeline"
          : "Prudential-Enhancement-Timeline";
      link.download = `${prefix}-${selectedMonth.replace(/\s+/g, "_")}-${asOfText.replace(
        /\s+/g,
        "_"
      )}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export dashboard image", err);
      alert("ไม่สามารถ Export ภาพรวมได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleSendToLine = () => {
    if (!isViewingCurrentMonth) {
      alert(
        `บอท LINE แสดงข้อมูลเดือนปัจจุบัน (${getSystemCurrentMonth()}) เท่านั้น
กดปุ่ม "เดือนปัจจุบัน" ก่อน แล้วค่อยส่งรูปเข้า LINE`
      );
      return;
    }
    captureAndUploadSnapshots(true);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto py-2 sm:py-4 px-2 sm:px-6">
      {/* Main Container Card */}
      <div
        ref={dashboardRef}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-6 lg:p-8"
      >
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
          onExportExcel={exportExcel}
          onExportJSON={exportJSON}
          onOpenColorModal={() => setIsColorModalOpen(true)}
          onResetClick={handleResetDefault}
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
            className="export-hide mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
          >
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>
                มีคนอื่นบันทึกข้อมูลไปก่อนหน้า การแก้ไขล่าสุดของคุณ<strong>ยังไม่ได้บันทึก</strong>{" "}
                กรุณาโหลดข้อมูลล่าสุด แล้วแก้อีกครั้ง
              </span>
            </div>
            <button
              type="button"
              disabled={isReloading}
              onClick={async () => {
                setIsReloading(true);
                try {
                  await reloadFromCloud();
                } finally {
                  setIsReloading(false);
                }
              }}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {isReloading && <Loader2 className="w-4 h-4 animate-spin" />}
              โหลดข้อมูลล่าสุด
            </button>
          </div>
        )}

        {/* Timeline Table Area with Unified Horizontal Scroll */}
        <div className="overflow-x-auto pb-4 mt-2">
          <div className="min-w-[960px] space-y-1">
            {/* Phase Track Column Header (Scrolls together with Rows) */}
            <TimelineTrackHeader timelineType={timelineType} />

            {!isLoaded ? (
              /* Loading Skeleton / Spinner (Zero Flicker) */
              <div className="py-14 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#ED1C24] animate-pulse mx-auto">
                  <Loader2 className="w-6 h-6 animate-spin text-[#ED1C24]" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-gray-700">กำลังเชื่อมต่อและโหลดข้อมูลจาก Cloud...</p>
                  <p className="text-xs text-gray-400">ดึงข้อมูลรอบเดือน {selectedMonth} จาก Supabase</p>
                </div>
                {/* 3 Ghost Skeletons */}
                <div className="max-w-2xl mx-auto space-y-2 pt-2 opacity-60">
                  <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl my-2">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-1.5" />
                <h3 className="text-sm font-bold text-gray-700">
                  ยังไม่มีข้อมูลใน{" "}
                  {timelineType === "product"
                    ? "New Product Timeline"
                    : "Enhancement Timeline"}{" "}
                  รอบเดือน ({selectedMonth})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                  {isAdmin
                    ? "กดปุ่มด้านล่างเพื่อเริ่มเพิ่มข้อมูล หรือกดคัดลอกจากเดือนก่อนหน้า"
                    : "เข้าสู่โหมด Admin เพื่อเพิ่มข้อมูลในรอบเดือนนี้"}
                </p>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="export-hide inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#ED1C24] text-white hover:bg-[#D4181F] transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มข้อมูลรอบนี้
                  </button>
                ) : null}
              </div>
            ) : (
              currentItems.map((item) => (
                <TimelineRow
                  key={item.id}
                  product={item}
                  timelineType={timelineType}
                  isAdmin={isAdmin}
                  onEdit={handleOpenEdit}
                  onDelete={(product) => setPendingAction({ type: "delete", product })}
                  onPause={(product) => setPendingAction({ type: "pause", product })}
                  onResume={(product) => setPendingAction({ type: "resume", product })}
                  customColorMap={colorMap}
                />
              ))
            )}

            {/* Projects paused in an earlier month: hidden from the timeline, listed here */}
            {isLoaded && pausedItems.length > 0 && (
              <div className="export-hide mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setIsPausedListOpen((v) => !v)}
                  aria-expanded={isPausedListOpen}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <PauseCircle className="w-4 h-4 text-slate-500" />
                    งานที่หยุดชั่วคราว ({pausedItems.length})
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${isPausedListOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isPausedListOpen && (
                  <ul className="divide-y divide-slate-200 border-t border-slate-200">
                    {pausedItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">
                            {item.name.replace(/\n/g, " ")}
                          </div>
                          <div className="text-xs text-gray-500">
                            [{item.broker}] · {item.owner} · หยุดตั้งแต่ {item.pausedSince}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: "resume", product: item })}
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
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
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <div className="export-hide flex items-center gap-1">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
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
          key={productToEdit ? `edit-${productToEdit.id}` : `add-${timelineType}-${selectedMonth}`}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setProductToEdit(null);
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
        key={pendingAction ? `${pendingAction.type}-${pendingAction.product.id}` : "none"}
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

      {/* Hidden Off-Screen Container for Seamless 2K Auto-Snapshots without Screen Flickering */}
      <div
        className="fixed top-0 pointer-events-none select-none overflow-hidden"
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
          selectedPeriod={`ภาพรวมทั้งปี ${selectedYear + 543}`}
          isAnnual={true}
          products={annualProducts}
          enhancements={annualEnhancements}
          colorMap={colorMap}
        />
      </div>
    </div>
  );
}
