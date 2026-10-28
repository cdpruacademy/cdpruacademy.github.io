"use client"

import * as React from "react"
import { useState } from "react"
import { Icon } from "@/components/icon"
import { confirmAction } from "@/lib/notify"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
  teamMembers: string[]
  memberColors?: Record<string, string>
  /** Projects per member in the period being viewed */
  memberCounts?: Record<string, number>
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
  memberCounts,
  onAddMember,
  onUpdateMember,
  onUpdateMemberColor,
  onDeleteMember,
  onResetToDefault,
}: TeamManagementModalProps) {
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberColor, setNewMemberColor] = useState("#ED1B2E")
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
      icon: "trash",
      tone: "danger",
    }).then((ok) => {
      if (!ok) return
      onDeleteMember(name)
      setErrorMessage(null)
    })
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()

  const iconButton =
    "touch-target flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink disabled:opacity-30"

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center p-4 duration-200 fade-in">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-management-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-16px_rgba(28,25,23,0.45)]"
      >
        <header className="flex items-center gap-3 border-b border-rule py-4 pr-4 pl-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pru-red text-white">
            <Icon name="team" size={20} />
          </span>
          <div className="flex-1">
            <h2 id="team-management-title" className="text-[19px] leading-tight font-bold text-ink">
              Team
            </h2>
            <p className="text-[13px] text-ink-soft">สีของแต่ละคนใช้ในกราฟ Analytics</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
          >
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-5 py-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[14px] bg-pru-red-soft px-3 py-2.5 text-[13px] text-brand-ink"
            >
              <Icon name="warning" size={16} strokeWidth={2} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <label htmlFor="new-member-name" className="sr-only">
              ชื่อสมาชิกใหม่
            </label>
            <input
              id="new-member-name"
              type="text"
              value={newMemberName}
              onChange={(e) => {
                setNewMemberName(e.target.value)
                setErrorMessage(null)
              }}
              placeholder="ชื่อสมาชิกใหม่ เช่น Ploy K."
              className="h-11 min-w-0 flex-1 rounded-[14px] border-[1.5px] border-rule px-3.5 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
            />
            <label
              className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: newMemberColor }}
              title="เลือกสีประจำตัว"
            >
              <span className="sr-only">เลือกสีประจำตัว</span>
              <input
                type="color"
                value={newMemberColor}
                onChange={(e) => setNewMemberColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <button
              type="submit"
              className="touch-target inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Icon name="plus" size={16} strokeWidth={2.2} />
              Add
            </button>
          </form>

          <ul className="-mx-1 flex min-h-0 flex-col gap-1.5 overflow-y-auto px-1">
            {teamMembers.map((member) => {
              const color = memberColors[member] || "#ED1B2E"
              const isEditing = editingName === member
              const count = memberCounts?.[member]
              return (
                <li
                  key={member}
                  className={`flex items-center gap-3 rounded-2xl py-2 pr-1.5 pl-2 ${isEditing ? "bg-pru-red-soft" : "bg-paper"}`}
                >
                  <label
                    className="relative flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full text-[13px] font-bold text-white"
                    style={{ backgroundColor: color }}
                    title="เปลี่ยนสีประจำตัว"
                  >
                    {initials(member)}
                    <span className="sr-only">เปลี่ยนสีของ {member}</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => onUpdateMemberColor?.(member, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>

                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={tempEditName}
                        onChange={(e) => setTempEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(member)
                        }}
                        aria-label={`แก้ชื่อ ${member}`}
                        autoFocus
                        className="h-[38px] min-w-0 flex-1 rounded-xl border-[1.5px] border-rule bg-white px-3 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member)}
                        aria-label="บันทึกชื่อ"
                        className="touch-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-done text-white"
                      >
                        <Icon name="check" size={16} strokeWidth={2.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(null)}
                        aria-label="ยกเลิก"
                        className={iconButton}
                      >
                        <Icon name="close" size={16} strokeWidth={2} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="truncate text-[15px] text-ink">{member}</b>
                        {count !== undefined && (
                          <span className="text-xs text-ink-soft">{count} projects</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(member)}
                        aria-label={`แก้ชื่อ ${member}`}
                        className={iconButton}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member)}
                        disabled={teamMembers.length <= 1}
                        aria-label={`ลบ ${member}`}
                        className={iconButton}
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="flex items-center justify-between border-t border-rule px-5 pt-3 pb-4">
          <button
            type="button"
            onClick={() => {
              confirmAction({
                title: "รีเซ็ตรายชื่อทีมและสี?",
                message: "รายชื่อคนในทีมและสีจะกลับเป็นค่าเริ่มต้น",
                confirmLabel: "รีเซ็ต",
                icon: "refresh",
                tone: "danger",
              }).then((ok) => {
                if (!ok) return
                onResetToDefault()
                setErrorMessage(null)
              })
            }}
            className="touch-target inline-flex h-11 items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink"
          >
            <Icon name="refresh" size={15} strokeWidth={2} />
            คืนค่าเริ่มต้น
          </button>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
