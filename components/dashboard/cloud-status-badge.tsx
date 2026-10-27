"use client"

import * as React from "react"
import { Cloud, CheckCircle2, HardDrive, RefreshCw } from "lucide-react"

interface CloudStatusBadgeProps {
  isCloudConnected: boolean
  isSyncing?: boolean
}

export function CloudStatusBadge({
  isCloudConnected,
  isSyncing = false,
}: CloudStatusBadgeProps) {
  return (
    <div
      title={
        isCloudConnected
          ? "เชื่อมต่อฐานข้อมูล Cloud (Supabase) เรียบร้อยแล้ว ข้อมูลอัปเดตตรงกันทุกเครื่อง"
          : "ทำงานในโหมดออฟไลน์ (Local Storage)"
      }
      className={`inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none ${
        isSyncing
          ? "animate-pulse border-blue-200 bg-blue-50 text-blue-700"
          : isCloudConnected
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
          <span>กำลังซิงค์...</span>
        </>
      ) : isCloudConnected ? (
        <>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs" />
          <Cloud className="h-3.5 w-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Cloud Synced</span>
          <span className="sm:hidden">Cloud</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          <HardDrive className="h-3 w-3 text-slate-500" />
          <span className="hidden sm:inline">โหมดในเครื่อง (Local)</span>
          <span className="sm:hidden">Local</span>
        </>
      )}
    </div>
  )
}
