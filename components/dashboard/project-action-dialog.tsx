"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, PauseCircle, PlayCircle, Trash2, X } from "lucide-react";
import { ProductItem } from "@/lib/timeline-data";

export type ProjectActionType = "pause" | "resume" | "delete";

export interface ProjectAction {
  type: ProjectActionType;
  product: ProductItem;
}

interface ProjectActionDialogProps {
  action: ProjectAction | null;
  selectedMonth: string;
  onConfirm: (action: ProjectAction) => void;
  onClose: () => void;
}

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();

export function ProjectActionDialog({
  action,
  selectedMonth,
  onConfirm,
  onClose,
}: ProjectActionDialogProps) {
  // The parent keys this component per action, so the typed name starts empty each time
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action, onClose]);

  if (!action) return null;

  const { type, product } = action;
  const projectName = product.name.replace(/\n/g, " ");
  const canConfirm = type !== "delete" || normalizeName(typedName) === normalizeName(projectName);

  const content = {
    pause: {
      icon: <PauseCircle className="w-5 h-5" />,
      iconClass: "bg-amber-50 text-amber-700",
      title: "หยุด project นี้ชั่วคราว",
      body: (
        <>
          <p>
            ตั้งแต่ <strong>{selectedMonth}</strong> งานนี้จะไม่ถูกยกไปเดือนถัดไป และไม่นับเป็นงานที่กำลังทำ
          </p>
          <p>เดือนก่อนหน้ายังแสดงตามเดิม และกด &ldquo;ทำต่อ&rdquo; ได้ทุกเมื่อ</p>
        </>
      ),
      confirmLabel: "หยุดชั่วคราว",
      confirmClass: "bg-amber-600 hover:bg-amber-700",
    },
    resume: {
      icon: <PlayCircle className="w-5 h-5" />,
      iconClass: "bg-emerald-50 text-emerald-700",
      title: "ทำ project นี้ต่อ",
      body: (
        <p>
          งานนี้จะกลับมาแสดงและยกไปเดือนถัดไปตามปกติ ตั้งแต่ <strong>{selectedMonth}</strong>
        </p>
      ),
      confirmLabel: "ทำต่อ",
      confirmClass: "bg-emerald-600 hover:bg-emerald-700",
    },
    delete: {
      icon: <Trash2 className="w-5 h-5" />,
      iconClass: "bg-red-50 text-[#ED1C24]",
      title: "ลบถาวร",
      body: (
        <>
          <p>
            งานนี้จะหายจาก<strong>ทุกเดือน</strong> รวมถึงประวัติและสถิติ และกู้คืนไม่ได้
          </p>
          <p>ถ้า project แค่หยุดหรือถูกยกเลิก ให้ใช้ &ldquo;หยุด project นี้ชั่วคราว&rdquo; แทน</p>
        </>
      ),
      confirmLabel: "ลบถาวร",
      confirmClass: "bg-[#ED1C24] hover:bg-[#D4181F]",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="project-action-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${content.iconClass}`}>
              {content.icon}
            </div>
            <h2 id="project-action-title" className="text-base font-bold text-gray-900">
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
          <div className="text-xs font-semibold text-slate-500">[{product.broker}] · {product.owner}</div>
          <div className="text-sm font-bold text-gray-900 leading-snug">{projectName}</div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-gray-600 leading-relaxed">{content.body}</div>

        {type === "delete" && (
          <div className="mt-4">
            <label htmlFor="confirm-project-name" className="block text-xs font-semibold text-gray-700 mb-1">
              พิมพ์ชื่องานเพื่อยืนยัน
            </label>
            <input
              id="confirm-project-name"
              autoFocus
              autoComplete="off"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={projectName}
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
            />
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ED1C24]" />
              ตัวพิมพ์เล็ก-ใหญ่และช่องว่างไม่มีผล
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            autoFocus={type !== "delete"}
            disabled={!canConfirm}
            onClick={() => onConfirm(action)}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${content.confirmClass}`}
          >
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
