"use client"

import * as React from "react"
import { useState } from "react"
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  Palette,
} from "lucide-react"
import { confirmAction } from "@/lib/notify"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
  teamMembers: string[]
  memberColors?: Record<string, string>
  onAddMember: (name: string, color?: string) => boolean
  onUpdateMember: (oldName: string, newName: string) => boolean
  onUpdateMemberColor?: (name: string, color: string) => void
  onDeleteMember: (name: string) => boolean
  onResetToDefault: () => void
}

export function TeamManagementModal({
  isOpen,
  onClose,
  teamMembers,
  memberColors = {},
  onAddMember,
  onUpdateMember,
  onUpdateMemberColor,
  onDeleteMember,
  onResetToDefault,
}: TeamManagementModalProps) {
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberColor, setNewMemberColor] = useState("#ED1C24")
  const [editingName, setEditingName] = useState<string | null>(null)
  const [tempEditName, setTempEditName] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dialogRef = useDialogA11y(isOpen, onClose)

  if (!isOpen) return null

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!newMemberName.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้รับผิดชอบ")
      return
    }
    const success = onAddMember(newMemberName.trim(), newMemberColor)
    if (success) {
      setNewMemberName("")
    } else {
      setErrorMessage("มีรายชื่อนี้อยู่ในระบบแล้ว หรือชื่อไม่ถูกต้อง")
    }
  }

  const handleStartEdit = (name: string) => {
    setEditingName(name)
    setTempEditName(name)
    setErrorMessage(null)
  }

  const handleSaveEdit = (oldName: string) => {
    setErrorMessage(null)
    if (!tempEditName.trim()) {
      setErrorMessage("ชื่อต้องไม่เว้นว่าง")
      return
    }
    const success = onUpdateMember(oldName, tempEditName.trim())
    if (success) {
      setEditingName(null)
    } else {
      setErrorMessage("มีรายชื่อนี้อยู่ในระบบแล้ว หรือไม่สามารถแก้ไขได้")
    }
  }

  const handleDelete = (name: string) => {
    if (teamMembers.length <= 1) {
      setErrorMessage("ต้องมีผู้รับผิดชอบในระบบอย่างน้อย 1 ท่าน")
      return
    }
    confirmAction({
      title: `ลบ ${name} ออกจากทีม?`,
      message:
        "งานเดิมที่มีชื่อนี้ยังอยู่ครบ แค่จะไม่มีชื่อนี้ให้เลือกเป็นผู้รับผิดชอบ",
      confirmLabel: "ลบออกจากทีม",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return
      onDeleteMember(name)
      setErrorMessage(null)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200 fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-management-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-brand-ink">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="team-management-title"
                className="text-sm font-bold text-gray-900"
              >
                จัดการรายชื่อ & สีประจำตัว (Team Members)
              </h2>
              <p className="text-xs text-gray-500">
                เพิ่ม แก้ไขชื่อ และกำหนดสีประจำตัวของคนในทีม
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
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-brand-ink">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add member form with color picker */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => {
                setNewMemberName(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder="เช่น Somchai K. หรือ สมชาย"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-xs focus:border-[#ED1C24] focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
            <div
              className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/15 shadow-2xs transition-transform hover:scale-105"
              title="เลือกสีประจำตัว"
            >
              <span
                className="pointer-events-none h-full w-full rounded-full"
                style={{ backgroundColor: newMemberColor }}
              />
              <input
                type="color"
                value={newMemberColor}
                onChange={(e) => setNewMemberColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-fill px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มคน</span>
            </button>
          </form>

          {/* Members List */}
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
            <div className="px-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              รายชื่อและสีประจำตัว ({teamMembers.length} คน)
            </div>

            {teamMembers.map((member) => {
              const color = memberColors[member] || "#ED1C24"
              return (
                <div
                  key={member}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 transition-colors hover:bg-slate-100/80"
                >
                  {editingName === member ? (
                    /* Inline Edit Mode */
                    <div className="mr-2 flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={tempEditName}
                        onChange={(e) => setTempEditName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1 text-xs focus:ring-2 focus:ring-brand focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member)}
                        className="rounded-md bg-green-600 p-1.5 text-white transition-colors hover:bg-green-700"
                        title="บันทึก"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(null)}
                        className="rounded-md bg-gray-200 p-1.5 text-gray-700 transition-colors hover:bg-gray-300"
                        title="ยกเลิก"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Normal View Mode */
                    <>
                      <div className="flex min-w-0 items-center gap-2.5">
                        {/* Interactive Color Swatch for each member */}
                        <div
                          className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/15 shadow-2xs transition-transform hover:scale-110"
                          title="คลิกเพื่อเปลี่ยนสีประจำตัว"
                        >
                          <span
                            className="pointer-events-none h-full w-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              if (onUpdateMemberColor) {
                                onUpdateMemberColor(member, e.target.value)
                              }
                            }}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        <span className="truncate text-xs font-semibold text-gray-800">
                          {member}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(member)}
                          className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white hover:text-blue-600"
                          title="แก้ไขชื่อ"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          disabled={teamMembers.length <= 1}
                          className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white hover:text-brand-ink disabled:opacity-30 disabled:hover:text-gray-500"
                          title="ลบออกจากระบบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Reset to initial button */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => {
                confirmAction({
                  title: "รีเซ็ตรายชื่อทีมและสี?",
                  message: "รายชื่อคนในทีมและสีจะกลับเป็นค่าเริ่มต้น",
                  confirmLabel: "รีเซ็ต",
                  tone: "danger",
                }).then((ok) => {
                  if (!ok) return
                  onResetToDefault()
                  setErrorMessage(null)
                })
              }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3" />
              <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-800 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-900"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
