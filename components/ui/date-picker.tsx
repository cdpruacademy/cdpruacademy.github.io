"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowTBC?: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function DatePicker({
  value = "",
  onChange,
  placeholder = "เลือกวันที่",
  className,
  allowTBC = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseDate = (str: string): Date => {
    if (!str || str.toLowerCase().includes("tbc")) return new Date(2026, 7, 1);

    const parts = str.trim().split(/[\s-]+/);
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const monthIdx = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === parts[1].slice(0, 3).toLowerCase()
      );
      const year = parts[2] ? parseInt(parts[2], 10) : 2026;
      if (!isNaN(day) && monthIdx !== -1) {
        return new Date(year, monthIdx, day);
      }
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date(2026, 7, 1) : d;
  };

  const initialDate = parseDate(value);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() || 7);

  useEffect(() => {
    if (value && !value.toLowerCase().includes("tbc")) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const monthName = MONTH_NAMES[viewMonth];
    const formatted = `${day} ${monthName} ${viewYear}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSetTBC = () => {
    onChange("TBC");
    setIsOpen(false);
  };

  const isDaySelected = (day: number) => {
    if (!value || value.toLowerCase().includes("tbc")) return false;
    const current = parseDate(value);
    return (
      current.getDate() === day &&
      current.getMonth() === viewMonth &&
      current.getFullYear() === viewYear
    );
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-50/80 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] text-left",
          value ? "text-gray-900 font-medium" : "text-gray-400"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </div>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
            title="ล้างวันที่"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 select-none animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-gray-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 mb-1">
            <span>อา</span>
            <span>จ</span>
            <span>อ</span>
            <span>พ</span>
            <span>พฤ</span>
            <span>ศ</span>
            <span>ส</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isDaySelected(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center font-medium transition-all text-xs",
                    selected
                      ? "bg-[#ED1C24] text-white font-bold shadow-xs"
                      : "text-gray-700 hover:bg-red-50 hover:text-[#ED1C24]"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {allowTBC && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleSetTBC}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                ตั้งเป็น TBC
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  handleSelectDay(now.getDate());
                }}
                className="text-[#ED1C24] hover:text-[#D4181F] hover:underline font-medium"
              >
                วันนี้
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
