"use client"

import * as React from "react"
import { useState } from "react"
import {
  Palette,
  X,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react"
import { confirmAction } from "@/lib/notify"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

interface BrokerColorModalProps {
  isOpen: boolean
  onClose: () => void
  onColorChange: (broker: string, hexColor: string) => void
  onAddChannel: (broker: string, hexColor: string) => void
  onDeleteChannel: (broker: string) => void
  onResetColors: () => void
  currentColors: Record<string, string>
  allProductsBrokers?: string[] // All brokers currently in use in projects
}

export function BrokerColorModal({
  isOpen,
  onClose,
  onColorChange,
  onAddChannel,
  onDeleteChannel,
  onResetColors,
  currentColors,
  allProductsBrokers = [],
}: BrokerColorModalProps) {
  const brokers = Object.keys(currentColors)

  // New channel state
  const [newChannelName, setNewChannelName] = useState("")
  const [newChannelColor, setNewChannelColor] = useState("#009FE3")
  const [channelError, setChannelError] = useState("")

  // Deletion warning modal/alert state
  const [deleteWarning, setDeleteWarning] = useState<{
    broker: string
    usageCount: number
  } | null>(null)

  const dialogRef = useDialogA11y(isOpen, onClose)

  if (!isOpen) return null

  const handleAddNewChannel = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newChannelName.trim()
    if (!trimmed) {
      setChannelError("กรุณาระบุชื่อ Channel / Broker")
      return
    }
    if (brokers.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setChannelError("Channel นี้มีอยู่ในระบบแล้ว")
      return
    }
    onAddChannel(trimmed, newChannelColor)
    setNewChannelName("")
    setChannelError("")
  }

  const initiateDeleteChannel = (
    brokerToDelete: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    // Count how many project items are currently using this channel
    const usageCount = allProductsBrokers.filter(
      (b) => b.toLowerCase() === brokerToDelete.toLowerCase()
    ).length

    if (usageCount > 0) {
      setDeleteWarning({
        broker: brokerToDelete,
        usageCount,
      })
    } else {
      confirmAction({
        title: `ลบช่องทาง ${brokerToDelete}?`,
        message: "ยังไม่มีงานใช้ช่องทางนี้ ลบแล้วเพิ่มกลับได้ภายหลัง",
        confirmLabel: "ลบช่องทาง",
        tone: "danger",
      }).then((ok) => {
        if (ok) onDeleteChannel(brokerToDelete)
      })
    }
  }

  const confirmDeleteChannelWithWarning = () => {
    if (!deleteWarning) return
    onDeleteChannel(deleteWarning.broker)
    setDeleteWarning(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 animate-in bg-black/50 backdrop-blur-xs duration-200 fade-in"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="broker-color-title"
        className="relative z-10 w-full max-w-md animate-in overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl duration-200 zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-brand-ink">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="broker-color-title"
                className="text-sm font-bold text-gray-900"
              >
                จัดการ Channel & สีประจำช่องทาง
              </h2>
              <p className="text-xs text-gray-500">
                คลิกที่วงกลมสีเพื่อเปลี่ยนสี หรือเพิ่ม/ลบ Channel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* Error notice */}
          {channelError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-brand-ink">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{channelError}</span>
            </div>
          )}

          {/* Add Channel Form */}
          <form
            onSubmit={handleAddNewChannel}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => {
                setNewChannelName(e.target.value)
                if (channelError) setChannelError("")
              }}
              placeholder="เช่น D2C, KBank, SCB..."
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-xs focus:border-[#ED1C24] focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
            <div
              className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/15 shadow-2xs transition-transform hover:scale-105"
              title="เลือกสีประจำช่องทาง"
            >
              <span
                className="pointer-events-none h-full w-full rounded-full"
                style={{ backgroundColor: newChannelColor }}
              />
              <input
                type="color"
                value={newChannelColor}
                onChange={(e) => setNewChannelColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-fill px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่ม</span>
            </button>
          </form>

          {/* Channels List */}
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
            <div className="px-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              ช่องทางและสี ({brokers.length} ช่องทาง)
            </div>

            {brokers.map((b) => {
              const color = currentColors[b] || "#64748B"
              return (
                <div
                  key={b}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 transition-colors hover:bg-slate-100/80"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* Interactive Color Swatch for each channel */}
                    <div
                      className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/15 shadow-2xs transition-transform hover:scale-110"
                      title="คลิกเพื่อเปลี่ยนสี"
                    >
                      <span
                        className="pointer-events-none h-full w-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => onColorChange(b, e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>
                    <span className="truncate text-xs font-semibold text-gray-800">
                      {b}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => initiateDeleteChannel(b, e)}
                    title={`ลบ Channel [${b}]`}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-brand-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onResetColors}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800"
              title="คืนค่าสีและช่องทางตั้งต้นทั้งหมด"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-brand-fill px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>

      {/* Warning Dialog when deleting a channel currently in use */}
      {deleteWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="backdrop-blur-2xs fixed inset-0 bg-black/50"
            onClick={() => setDeleteWarning(null)}
          />
          <div className="relative z-20 w-full max-w-sm animate-in space-y-4 rounded-2xl bg-white p-5 shadow-2xl zoom-in-95">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>แจ้งเตือน Channel มีข้อมูลใช้งานอยู่</span>
            </div>
            <div className="text-xs leading-relaxed text-gray-600">
              Channel{" "}
              <strong className="text-gray-900">
                [{deleteWarning.broker}]
              </strong>{" "}
              มีโปรเจกต์ในระบบกำลังใช้งานอยู่จำนวน{" "}
              <strong className="text-brand-ink">
                {deleteWarning.usageCount} รายการ
              </strong>
              <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                🛡️ <strong>ระบบจะลบเฉพาะ Channel นี้ออกจากเมนูตัวเลือก</strong>{" "}
                โดยจะไม่ลบหรือเปลี่ยนแปลงข้อมูลโปรเจกต์ในตารางเดิมครับ
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteWarning(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteChannelWithWarning}
                className="rounded-lg bg-brand-fill px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-hover"
              >
                ยืนยันลบออกจากเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
