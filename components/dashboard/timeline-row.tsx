"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { ProductItem, PHASES, TimelineType } from "@/lib/timeline-data";
import { ElearningMonitorIcon } from "./elearning-icon";
import { Edit2, Download, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { resolveBrokerColor } from "@/lib/broker-colors";

interface TimelineRowProps {
  product: ProductItem;
  timelineType?: TimelineType;
  isAdmin?: boolean;
  onEdit: (product: ProductItem) => void;
  onDelete: (id: string) => void;
  customColorMap?: Record<string, string>;
}

export function TimelineRow({
  product,
  timelineType = "product",
  isAdmin = false,
  onEdit,
  onDelete,
  customColorMap = {},
}: TimelineRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isExportingThis, setIsExportingThis] = useState(false);

  const isEnhancement = timelineType === "enhancement";

  // Format date string to remove 4-digit year (e.g. "19 May 2026" -> "19 May", "TBC" -> "TBC")
  const formatShortDate = (dateStr?: string): string => {
    if (!dateStr) return "";
    // Remove 4-digit years like 2024, 2025, 2026, 2567, 2568, 2569 (with optional preceding space or comma)
    return dateStr
      .replace(/[, ]*\b(20\d{2}|25\d{2})\b/g, "")
      .trim();
  };

  const brokerColor = resolveBrokerColor(product.broker, customColorMap);

  // Find min and max active phase indices to draw progress lines
  const phaseIndicesWithMilestones: { index: number; isCompleted: boolean }[] = [];
  PHASES.forEach((phase, idx) => {
    const m = product.milestones[phase.key];
    if (m) {
      phaseIndicesWithMilestones.push({
        index: idx,
        isCompleted: m.status === "completed",
      });
    }
  });

  const firstIndex = phaseIndicesWithMilestones.length > 0 ? phaseIndicesWithMilestones[0].index : 0;
  const completedIndices = phaseIndicesWithMilestones.filter((p) => p.isCompleted);
  const lastCompletedIndex =
    completedIndices.length > 0
      ? completedIndices[completedIndices.length - 1].index
      : firstIndex;
  const lastOverallIndex =
    phaseIndicesWithMilestones.length > 0
      ? phaseIndicesWithMilestones[phaseIndicesWithMilestones.length - 1].index
      : 5;

  // Single row export to PNG
  const handleExportRow = async () => {
    if (!rowRef.current) return;
    try {
      setIsExportingThis(true);
      await new Promise((resolve) => setTimeout(resolve, 60));

      const dataUrl = await toPng(rowRef.current, {
        cacheBust: true,
        backgroundColor: "#FFFFFF",
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains("export-hide")) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      const safeName = product.name.replace(/[^a-zA-Z0-9ก-๙]/g, "_").slice(0, 30);
      link.download = `timeline-${safeName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export row image", err);
    } finally {
      setIsExportingThis(false);
    }
  };

  return (
    <div
      ref={rowRef}
      className="group relative grid grid-cols-[220px_1fr_130px] items-center gap-2 py-3 px-1 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-gray-100 last:border-b-0"
    >
      {/* Floating Action Buttons on Hover */}
      <div className="export-hide absolute right-2 top-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-lg shadow-sm border border-gray-200">
        {isAdmin && !product.isCrossMonth && (
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="แก้ไขข้อมูล (Admin)"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleExportRow}
          disabled={isExportingThis}
          className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Export แถวนี้เป็นรูป PNG"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {isAdmin && !product.isCrossMonth && (
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="p-1 text-gray-600 hover:text-[#ED1C24] hover:bg-red-50 rounded transition-colors"
            title="ลบแถวนี้ (Admin)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1. Left Product Info Card */}
      <div
        style={{ borderLeftColor: brokerColor }}
        className={`rounded-xl p-2.5 h-[68px] flex flex-col justify-between shadow-2xs border-l-4 ${
          product.isCrossMonth ? "bg-amber-50/70 border-dashed border-amber-300" : "bg-[#EEF2F5]"
        }`}
      >
        <div className="flex items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-1 overflow-hidden">
            <span
              style={{ color: brokerColor }}
              className="font-bold tracking-tight text-[11px] shrink-0"
            >
              [{product.broker}]
            </span>
            {product.isCrossMonth && (
              <span
                className="text-[9px] bg-amber-200/80 text-amber-800 font-semibold px-1 py-0.2 rounded shrink-0"
                title={`ข้อมูลอ้างอิงจากรอบเดือน ${product.originalMonth || ""}`}
              >
                จาก {product.originalMonth?.split(" ")[0]}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-[#64748B] truncate" title={product.owner}>
            {product.owner}
          </span>
        </div>
        <div
          className="text-[12px] font-bold text-[#1E293B] leading-tight line-clamp-2"
          title={product.name}
        >
          {product.name}
        </div>
      </div>

      {/* 2. Middle Timeline Track (6 columns) */}
      <div className="relative grid grid-cols-6 gap-2 items-center min-h-[68px] px-2">
        {/* Mathematically Centered Connecting Lines: center(i) = ((i + 0.5) / 6) * 100% */}
        <div className="absolute inset-x-0 px-2 top-[22px] pointer-events-none -z-0">
          <div className="relative w-full h-[3px]">
            {/* Completed Green Line connecting exactly from center of first dot to center of last completed dot */}
            {lastCompletedIndex > firstIndex && (
              <div
                className="absolute top-0 h-[3px] bg-[#86EFAC] rounded-full"
                style={{
                  left: `${((firstIndex + 0.5) / 6) * 100}%`,
                  width: `${((lastCompletedIndex - firstIndex) / 6) * 100}%`,
                }}
              />
            )}

            {/* Pending Dotted Grey Line connecting exactly to pending milestones */}
            {lastOverallIndex > lastCompletedIndex && (
              <div
                className="absolute top-0 h-[3px] border-t-2 border-dotted border-gray-300"
                style={{
                  left: `${((lastCompletedIndex + 0.5) / 6) * 100}%`,
                  width: `${((lastOverallIndex - lastCompletedIndex) / 6) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* 6 Phase Columns & Milestone Nodes */}
        {PHASES.map((phase) => {
          const milestone = product.milestones[phase.key];

          if (!milestone) {
            return (
              <div key={phase.key} className="flex flex-col items-center justify-center h-full" />
            );
          }

          const isCompleted = milestone.status === "completed";

          return (
            <div
              key={phase.key}
              className="flex flex-col items-center justify-start h-full pt-2 z-10"
            >
              {/* Node Icon/Circle */}
              <div className="relative flex items-center justify-center min-h-[28px]">
                {milestone.isElearningIcon ? (
                  <ElearningMonitorIcon color={isEnhancement ? "blue" : "red"} />
                ) : isCompleted ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#86EFAC] border-2 border-white shadow-xs" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-[#CBD5E1] border-2 border-white" />
                )}
              </div>

              {/* Date text label */}
              {milestone.date && (
                <div className="text-[10px] md:text-[11px] font-medium text-[#475569] mt-1 whitespace-nowrap text-center">
                  {formatShortDate(milestone.date)}
                </div>
              )}

              {/* CS Date if applicable */}
              {phase.key === "internal-training" && product.csDate && (
                <div className="text-[10px] font-medium text-[#475569] mt-0.5 whitespace-nowrap">
                  {formatShortDate(product.csDate)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Right Launch Dates / Custom Status Panel */}
      <div className="flex flex-col justify-center text-right pr-2">
        {product.customRightLabel ? (
          <div className="text-[11px] font-bold text-[#475569] leading-tight">
            {formatShortDate(product.customRightLabel)}
          </div>
        ) : (
          <>
            <div className="text-[11px] font-medium text-[#475569] leading-tight">
              Internal : {formatShortDate(product.internalDate) || "TBC"}
            </div>
            <div className="text-[11px] font-bold text-[#16A34A] leading-tight mt-1">
              Commercial : {formatShortDate(product.commercialDate) || "TBC"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
