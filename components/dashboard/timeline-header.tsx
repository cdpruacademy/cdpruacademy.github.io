"use client";

import * as React from "react";
import { useState } from "react";
import {
  TimelineType,
  PRODUCT_PHASES,
  ENHANCEMENT_PHASES,
  AVAILABLE_MONTHS,
  getMonthStatus,
} from "@/lib/timeline-data";
import {
  Calendar,
  Plus,
  Download,
  RefreshCw,
  Edit3,
  Check,
  FileSpreadsheet,
  FileJson,
  Palette,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  BarChart3,
  Send,
  Loader2,
} from "lucide-react";
import { CloudStatusBadge } from "./cloud-status-badge";

interface TimelineHeaderProps {
  timelineType: TimelineType;
  onTimelineTypeChange: (type: TimelineType) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths?: string[];
  onAddNewMonth?: (month: string) => void;
  asOfText: string;
  onAsOfChange: (asOf: string) => void;
  onAddClick: () => void;
  onExportAllClick: () => void;
  onExportExcel: () => void;
  onExportJSON: () => void;
  onOpenColorModal: () => void;
  onResetClick: () => void;
  onSendLineClick?: () => void;
  isSendingLine?: boolean;
  isExporting?: boolean;
  isAdmin?: boolean;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
}

export function TimelineHeader({
  timelineType,
  onTimelineTypeChange,
  selectedMonth,
  onMonthChange,
  availableMonths = AVAILABLE_MONTHS,
  onAddNewMonth,
  asOfText,
  onAsOfChange,
  onAddClick,
  onExportAllClick,
  onExportExcel,
  onExportJSON,
  onOpenColorModal,
  onResetClick,
  onSendLineClick,
  isSendingLine = false,
  isExporting = false,
  isAdmin = false,
  isCloudConnected = false,
  isSyncing = false,
}: TimelineHeaderProps) {
  const [isEditingAsOf, setIsEditingAsOf] = useState(false);
  const [tempAsOf, setTempAsOf] = useState(asOfText);
  const [isAddingMonthModal, setIsAddingMonthModal] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState("");

  const isEnhancement = timelineType === "enhancement";

  const currentIndex = availableMonths.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1]);
    }
  };

  const handleSaveAsOf = () => {
    if (tempAsOf.trim()) {
      onAsOfChange(tempAsOf.trim());
    }
    setIsEditingAsOf(false);
  };

  const handleCreateMonth = () => {
    if (newMonthInput.trim() && onAddNewMonth) {
      onAddNewMonth(newMonthInput.trim());
      setNewMonthInput("");
      setIsAddingMonthModal(false);
    }
  };

  return (
    <div className="w-full select-none">
      {/* 1. TOP SUB-NAVIGATION: Timeline Tabs & Month Pill Bar (Completely Hidden on Export) */}
      <div className="export-hide flex flex-col gap-3 pb-4 mb-2 border-b border-gray-100">
        {/* Row A: Timeline Switcher Tabs + Month Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Timeline Mode Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-gray-100/90 rounded-xl">
            <button
              type="button"
              onClick={() => onTimelineTypeChange("product")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isEnhancement
                  ? "bg-white text-[#ED1C24] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
              <span className="hidden sm:inline">New Product Timeline</span>
              <span className="sm:hidden">New Product</span>
            </button>

            <button
              type="button"
              onClick={() => onTimelineTypeChange("enhancement")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isEnhancement
                  ? "bg-white text-[#0066CC] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
              <span className="hidden sm:inline">Enhancement Timeline</span>
              <span className="sm:hidden">Enhancement</span>
            </button>
          </div>

          {/* Cloud Status Badge (status indicator) */}
          <CloudStatusBadge
            isCloudConnected={isCloudConnected}
            isSyncing={isSyncing}
          />
        </div>

        {/* Row B: Month Selector Navigation Pills */}
        <div className="flex items-center justify-between gap-1.5 pt-1 bg-slate-50/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1 px-1" title="เลือกรอบเดือน">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">รอบเดือน:</span>
            </span>

            {/* Prev Month Arrow */}
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentIndex <= 0}
              className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Month Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 flex-1">
            {availableMonths.map((m) => {
              const isSelected = m === selectedMonth;
              const status = getMonthStatus(m);
              const isCurrent = status === "current";
              const isPast = status === "past";
              const isFuture = status === "future";

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMonthChange(m)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                    isSelected
                      ? isEnhancement
                        ? "bg-[#0066CC] text-white shadow-xs"
                        : "bg-[#ED1C24] text-white shadow-xs"
                      : "bg-white text-gray-700 hover:bg-gray-200/80 border border-gray-200"
                  }`}
                >
                  <span>{m}</span>
                  {isCurrent && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                        isSelected ? "bg-white/30 text-white" : "bg-red-50 text-[#ED1C24]"
                      }`}
                    >
                      ปัจจุบัน
                    </span>
                  )}
                  {isPast && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                        isSelected ? "bg-white/30 text-white" : "text-gray-400"
                      }`}
                    >
                      ย้อนหลัง
                    </span>
                  )}
                  {isFuture && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                        isSelected ? "bg-white/30 text-white" : "text-blue-500"
                      }`}
                    >
                      แผนงาน
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Month Arrow + Add Month */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentIndex >= availableMonths.length - 1}
              className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {isAdmin && onAddNewMonth && (
              <button
                type="button"
                onClick={() => setIsAddingMonthModal(true)}
                title="เพิ่มรอบเดือนใหม่"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เพิ่มเดือน</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN TITLE BAR: Visible on Export & Normal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 pt-0">
        {/* Left: Calendar Badge + Month Title & As-Of Date */}
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-colors ${
              isEnhancement ? "bg-[#005BAB]" : "bg-[#ED1C24]"
            }`}
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#2D2D2D] leading-none">
                {selectedMonth}
              </span>
            </div>

            {/* Editable As Of Text */}
            <div className="mt-1 flex items-center gap-1.5">
              {isEditingAsOf ? (
                <div className="flex items-center gap-1 export-hide">
                  <input
                    type="text"
                    value={tempAsOf}
                    autoFocus
                    onChange={(e) => setTempAsOf(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveAsOf();
                      if (e.key === "Escape") setIsEditingAsOf(false);
                    }}
                    placeholder="เช่น as of 31 Aug"
                    className="text-xs font-semibold border border-[#ED1C24] rounded px-1.5 py-0.5 w-32 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsOf}
                    className="p-1 bg-[#ED1C24] text-white rounded hover:bg-[#D4181F]"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 group cursor-pointer"
                  onClick={() => isAdmin && setIsEditingAsOf(true)}
                >
                  <span className="text-xs font-semibold text-[#64748B]">
                    {asOfText}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAsOf(true)}
                      className="export-hide opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 transition-opacity"
                      title="คลิกเพื่อแก้ไข As of"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Big Title (Stays on export) + Action Buttons (Hidden on Export) */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full md:w-auto md:ml-auto">
          {/* Big Presentation Title (Clean on Export) */}
          <div className="text-left sm:text-right">
            <span
              className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${
                isEnhancement ? "text-[#0066CC]" : "text-[#ED1C24]"
              }`}
            >
              {isEnhancement ? "ENHANCEMENT" : "NEW PRODUCT"}{" "}
            </span>
            <span className="text-lg sm:text-xl md:text-2xl font-black text-[#5A646E] tracking-tight">
              TIMELINE
            </span>
          </div>

          {/* ALL ACTION BUTTONS (COMPLETELY HIDDEN ON EXPORT) */}
          <div className="export-hide flex flex-wrap items-center gap-1 sm:gap-2">

            {/* Color Customizer Button (Admin only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenColorModal}
                title="ปรับแต่งสีประจำ Channel / Broker"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-all"
              >
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden lg:inline">ปรับสี</span>
              </button>
            )}

            {/* Reset button (Admin only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={onResetClick}
                title="รีเซ็ตเป็นข้อมูลเริ่มต้นสำหรับเดือนนี้"
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={onExportExcel}
              title="Export เป็นไฟล์ Excel (.xlsx)"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-700" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* JSON Export Button */}
            <button
              type="button"
              onClick={onExportJSON}
              title="Export เป็นไฟล์ JSON"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-all"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {/* Export Image Button */}
            <button
              type="button"
              onClick={onExportAllClick}
              disabled={isExporting}
              title="Export ทั้งกระดานเป็นรูปภาพ PNG (ไม่มีปุ่มติดไปด้วย)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-gray-700" />
              <span>{isExporting ? "กำลังสร้างรูป..." : "Export รูปภาพ"}</span>
            </button>

            {/* Send to LINE Button */}
            {onSendLineClick && (
              <button
                type="button"
                onClick={onSendLineClick}
                disabled={isSendingLine}
                title="อัปเดตรูปไทม์ไลน์นี้ขึ้น Cloud และส่งเข้า LINE ให้ทันที"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-[#06C755] bg-[#06C755]/10 text-[#05963F] hover:bg-[#06C755] hover:text-white shadow-2xs transition-all disabled:opacity-50"
              >
                {isSendingLine ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06C755]" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSendingLine ? "กำลังส่งเข้า LINE..." : "ส่งรูปเข้า LINE"}</span>
              </button>
            )}

            {/* Add Product Button (Admin only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={onAddClick}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition-all ${
                  isEnhancement
                    ? "bg-[#0066CC] hover:bg-[#0052A3]"
                    : "bg-[#ED1C24] hover:bg-[#D4181F]"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มข้อมูล</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add New Month Modal (Simple Dialog) */}
      {isAddingMonthModal && (
        <div className="export-hide fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">เพิ่มรอบเดือนใหม่</h3>
            <p className="text-xs text-gray-500">
              ระบุชื่อรอบเดือน เช่น <code>JAN 2027</code> หรือ <code>Q1 2027</code>
            </p>
            <input
              type="text"
              value={newMonthInput}
              onChange={(e) => setNewMonthInput(e.target.value)}
              placeholder="เช่น JAN 2027"
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMonthModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateMonth}
                disabled={!newMonthInput.trim()}
                className="px-3 py-1.5 text-xs font-bold bg-[#ED1C24] text-white rounded-lg hover:bg-[#D4181F] disabled:opacity-50"
              >
                เพิ่มรอบเดือน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineTrackHeaderProps {
  timelineType: TimelineType;
}

export function TimelineTrackHeader({ timelineType }: TimelineTrackHeaderProps) {
  const isEnhancement = timelineType === "enhancement";
  const phases = isEnhancement ? ENHANCEMENT_PHASES : PRODUCT_PHASES;

  return (
    <div className="min-w-[960px] grid grid-cols-[220px_1fr_130px] items-center gap-2 pb-2 pt-1 border-b border-gray-200">
      {/* Left Column Label */}
      <div className="text-xs font-bold text-[#5A646E] pl-2 uppercase tracking-wide">
        Product & Channel
      </div>

      {/* Middle 7 Phases Column Badges */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {phases.map((phase) => (
          <div
            key={phase.key}
            className={`text-[10px] md:text-[11px] font-bold py-1 px-1 rounded-md shadow-2xs whitespace-pre-line leading-tight flex items-center justify-center min-h-[36px] ${phase.badgeBg} ${phase.badgeTextColor}`}
          >
            {phase.label}
          </div>
        ))}
      </div>

      {/* Right Column Label - Target Launch */}
      <div className="text-xs md:text-sm font-black text-white pr-2 text-center uppercase tracking-wider bg-[#ED1C24] rounded-md py-2 px-2 shadow-sm flex items-center justify-center gap-1.5">
        <Target className="w-4 h-4 shrink-0" />
        <span>Target Launch</span>
      </div>
    </div>
  );
}
