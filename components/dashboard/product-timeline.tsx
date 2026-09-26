"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useProducts } from "@/hooks/use-products";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { ProductItem } from "@/lib/timeline-data";
import { TimelineHeader, TimelineTrackHeader } from "./timeline-header";
import { TimelineRow } from "./timeline-row";
import { TimelineExportBoard } from "./timeline-export-board";
import { ProductFormModal } from "./product-form-modal";
import { BrokerColorModal } from "./broker-color-modal";
import { useTeamMembers } from "@/hooks/use-team-members";
import { toPng } from "html-to-image";
import { uploadTimelineSnapshot, saveBothTimelineSnapshots } from "@/lib/supabase";
import { Plus, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";

const BROKER_COLORS_KEY = "pru_broker_colors_map_v1";

const DEFAULT_COLORS: Record<string, string> = {
  ttb: "#009FE3", // ฟ้าสดใส ttb
  "ttb touch": "#009FE3",
  UOB: "#0B2265", // น้ำเงินเข้ม UOB
  Agency: "#ED1C24", // แดง Prudential
  "New Broker": "#334155", // เทา Slate
  Audit: "#1E293B", // ดำ Charcoal
};

export function ProductTimeline() {
  const {
    timelineType,
    setTimelineType,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addNewMonth,
    copyFromPreviousMonth,
    asOfText,
    setAsOfText,
    currentItems,
    isLoaded,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToDefault,
    exportExcel,
    exportJSON,
    monthlyStore,
    isCloudConnected,
    isSyncing,
  } = useProducts();

  const { isAdmin } = useAdminAuth();
  const {
    teamMembers,
    addMember,
    updateMember,
    deleteMember,
    resetToDefault: resetTeamMembers,
  } = useTeamMembers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isSendingLine, setIsSendingLine] = useState(false);

  // Broker Colors State
  const [colorMap, setColorMap] = useState<Record<string, string>>(DEFAULT_COLORS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BROKER_COLORS_KEY);
      if (stored) {
        setColorMap({ ...DEFAULT_COLORS, ...JSON.parse(stored) });
      }
    } catch (_) {}
  }, []);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const productExportRef = useRef<HTMLDivElement>(null);
  const enhancementExportRef = useRef<HTMLDivElement>(null);
  const isAutoSyncingRef = useRef(false);
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        // 3. Upload both to Supabase Storage (upsert = true, overwrite monthly filenames)
        const uploadRes = await saveBothTimelineSnapshots(
          productDataUrl,
          enhancementDataUrl,
          selectedMonth,
          asOfText
        );

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || "ไม่สามารถอัปโหลดภาพได้");
        }

        if (showUserAlert) {
          alert(
            `✅ อัปเดตรูปไทม์ไลน์ขึ้น Cloud สำเร็จครบทั้ง 2 ตาราง!\n\n` +
            `• 🎯 New Product Timeline: บันทึกเรียบร้อย\n` +
            `• ⚡ Enhancement Timeline: บันทึกเรียบร้อย\n` +
            `• รอบเดือน: ${selectedMonth} (${asOfText})\n\n` +
            `สมาชิกใน LINE สามารถพิมพ์ "CD รูป" เพื่อดูภาพทั้ง 2 ตารางได้ทันทีครับ`
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

  // Silent debounced background auto-snapshot trigger (1.5s delay)
  const triggerBackgroundAutoSnapshot = useCallback(() => {
    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }
    autoSyncTimeoutRef.current = setTimeout(() => {
      if (isAutoSyncingRef.current) return;
      isAutoSyncingRef.current = true;
      captureAndUploadSnapshots(false).finally(() => {
        isAutoSyncingRef.current = false;
      });
    }, 1500);
  }, [captureAndUploadSnapshots]);

  // Initial load auto-refresh: after cloud data finishes loading, update snapshot so Monday cron has fresh images
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        triggerBackgroundAutoSnapshot();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, triggerBackgroundAutoSnapshot]);

  const handleColorChange = (broker: string, hex: string) => {
    const updated = { ...colorMap, [broker]: hex };
    setColorMap(updated);
    try {
      localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
    } catch (_) {}
    triggerBackgroundAutoSnapshot();
  };

  const handleAddChannel = (broker: string, hex: string) => {
    const updated = { ...colorMap, [broker]: hex };
    setColorMap(updated);
    try {
      localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
    } catch (_) {}
    triggerBackgroundAutoSnapshot();
  };

  const handleDeleteChannel = (broker: string) => {
    const updated = { ...colorMap };
    delete updated[broker];
    setColorMap(updated);
    try {
      localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
    } catch (_) {}
    triggerBackgroundAutoSnapshot();
  };

  const handleResetColors = () => {
    setColorMap(DEFAULT_COLORS);
    try {
      localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(DEFAULT_COLORS));
    } catch (_) {}
    triggerBackgroundAutoSnapshot();
  };

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
    triggerBackgroundAutoSnapshot();
  };

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id);
    triggerBackgroundAutoSnapshot();
  };

  const handleAsOfChange = (text: string) => {
    setAsOfText(text);
    triggerBackgroundAutoSnapshot();
  };

  const handleResetDefault = () => {
    resetToDefault();
    triggerBackgroundAutoSnapshot();
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
          availableMonths={availableMonths}
          onAddNewMonth={addNewMonth}
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
                  onDelete={handleDeleteProduct}
                  customColorMap={colorMap}
                />
              ))
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
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        timelineType={timelineType}
        selectedMonth={selectedMonth}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        teamMembers={teamMembers}
        availableBrokers={colorMap}
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
          items={monthlyStore?.[selectedMonth]?.products || []}
          colorMap={colorMap}
        />
        <div style={{ height: "40px" }} />
        <TimelineExportBoard
          ref={enhancementExportRef}
          timelineType="enhancement"
          selectedMonth={selectedMonth}
          asOfText={asOfText}
          items={monthlyStore?.[selectedMonth]?.enhancements || []}
          colorMap={colorMap}
        />
      </div>
    </div>
  );
}
