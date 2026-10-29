"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { AlertTriangle, PauseCircle, PlayCircle, Trash2, X } from "lucide-react"
import { ProductItem } from "@/lib/timeline-data"

export type ProjectActionType = "pause" | "resume" | "delete"

export interface ProjectAction {
  type: ProjectActionType
  product: ProductItem
}

interface ProjectActionDialogProps {
  action: ProjectAction | null
  selectedMonth: string
  onConfirm: (action: ProjectAction) => void
  onClose: () => void
}

const normalizeName = (name: string) =>
  name.replace(/\s+/g, " ").trim().toLowerCase()

export function ProjectActionDialog({
  action,
  selectedMonth,
  onConfirm,
  onClose,
}: ProjectActionDialogProps) {
  // The parent keys this component per action, so the typed name starts empty each time
  const [typedName, setTypedName] = useState("")

  useEffect(() => {
    if (!action) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [action, onClose])

  if (!action) return null

  const { type, product } = action
  const projectName = product.name.replace(/\n/g, " ")
  const canConfirm =
    type !== "delete" || normalizeName(typedName) === normalizeName(projectName)

  const content = {
    pause: {
      icon: <PauseCircle className="h-5 w-5" />,
      iconClass: "bg-amber-50 text-amber-700",
      title: "หยุด project นี้ชั่วคราว",
      body: (
        <>
          <p>
            ตั้งแต่ <strong>{selectedMonth}</strong> งานนี้จะไม่ถูกยกไปเดือนถัดไป
            กด &ldquo;ทำต่อ&rdquo; ได้ทุกเมื่อ
          </p>
        </>
      ),
      confirmLabel: "หยุดชั่วคราว",
      confirmClass: "bg-amber-600 hover:bg-amber-700",
    },
    resume: {
      icon: <PlayCircle className="h-5 w-5" />,
      iconClass: "bg-emerald-50 text-emerald-700",
      title: "ทำ project นี้ต่อ",
      body: (
        <p>
          งานนี้จะกลับมาแสดงและยกไปเดือนถัดไปตามปกติ ตั้งแต่{" "}
          <strong>{selectedMonth}</strong>
        </p>
      ),
      confirmLabel: "ทำต่อ",
      confirmClass: "bg-emerald-600 hover:bg-emerald-700",
    },
    delete: {
      icon: <Trash2 className="h-5 w-5" />,
      iconClass: "bg-red-50 text-brand-ink",
      title: "ลบถาวร",
      body: (
        <>
          <p>
            งานนี้จะหายจาก<strong>ทุกเดือน</strong> รวมถึงประวัติและสถิติ
            และกู้คืนไม่ได้
          </p>
          <p>
            ถ้า project แค่หยุดหรือถูกยกเลิก ให้ใช้ &ldquo;หยุด project
            นี้ชั่วคราว&rdquo; แทน
          </p>
        </>
      ),
      confirmLabel: "ลบถาวร",
      confirmClass: "bg-brand-fill hover:bg-brand-hover",
    },
  }[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 animate-in bg-black/40 backdrop-blur-xs fade-in"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="project-action-title"
        className="relative z-10 w-full max-w-md animate-in rounded-2xl bg-white p-6 shadow-2xl duration-200 zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${content.iconClass}`}
            >
              {content.icon}
            </div>
            <h2
              id="project-action-title"
              className="text-base font-bold text-gray-900"
            >
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="touch-target rounded-lg p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-xs font-semibold text-slate-500">
            [{product.broker}] · {product.owner}
          </div>
          <div className="text-sm leading-snug font-bold text-gray-900">
            {projectName}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
          {content.body}
        </div>

        {type === "delete" && (
          <div className="mt-4">
            <label
              htmlFor="confirm-project-name"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              พิมพ์ชื่องานเพื่อยืนยัน
            </label>
            <input
              id="confirm-project-name"
              autoFocus
              autoComplete="off"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={projectName}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-brand focus:outline-none"
            />
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="h-3.5 w-3.5 text-brand-ink" />
              ตัวพิมพ์เล็ก-ใหญ่และช่องว่างไม่มีผล
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            autoFocus={type !== "delete"}
            disabled={!canConfirm}
            onClick={() => onConfirm(action)}
            className={`touch-target rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${content.confirmClass}`}
          >
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
