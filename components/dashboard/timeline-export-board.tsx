"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { TimelineTrackHeader } from "./timeline-header";
import { TimelineRow } from "./timeline-row";
import { ProductItem, TimelineType } from "@/lib/timeline-data";

interface TimelineExportBoardProps {
  timelineType: TimelineType;
  selectedMonth: string;
  asOfText: string;
  items: ProductItem[];
  colorMap: Record<string, string>;
}

export const TimelineExportBoard = React.forwardRef<HTMLDivElement, TimelineExportBoardProps>(
  ({ timelineType, selectedMonth, asOfText, items, colorMap }, ref) => {
    const isEnhancement = timelineType === "enhancement";

    return (
      <div
        ref={ref}
        style={{ width: "1280px", backgroundColor: "#ffffff" }}
        className="p-8 rounded-2xl shadow-sm border border-gray-200 font-sans"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between gap-3 pb-4 pt-1 border-b border-gray-100 mb-3">
          {/* Left: Month badge & As-of */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                isEnhancement ? "bg-[#005BAB]" : "bg-[#ED1C24]"
              }`}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-[#2D2D2D] leading-none">
                {selectedMonth}
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-1.5">
                {asOfText}
              </div>
            </div>
          </div>

          {/* Right: Big Presentation Title */}
          <div className="text-right">
            <span
              className={`text-2xl font-black tracking-tight ${
                isEnhancement ? "text-[#0066CC]" : "text-[#ED1C24]"
              }`}
            >
              {isEnhancement ? "ENHANCEMENT" : "NEW PRODUCT"}{" "}
            </span>
            <span className="text-2xl font-black text-[#5A646E] tracking-tight">
              TIMELINE
            </span>
          </div>
        </div>

        {/* Track Column Header */}
        <TimelineTrackHeader timelineType={timelineType} />

        {/* Rows */}
        <div className="space-y-1 mt-2">
          {items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl my-4 text-gray-400 text-sm font-semibold">
              ไม่มีรายการโปรเจกต์ในรอบเดือนนี้
            </div>
          ) : (
            items.map((item) => (
              <TimelineRow
                key={item.id}
                product={item}
                timelineType={timelineType}
                isAdmin={false}
                onEdit={() => {}}
                onDelete={() => {}}
                customColorMap={colorMap}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);

TimelineExportBoard.displayName = "TimelineExportBoard";
