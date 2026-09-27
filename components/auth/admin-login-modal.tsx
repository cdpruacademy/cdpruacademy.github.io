"use client";

import * as React from "react";
import { useState } from "react";
import { Lock, X, CheckCircle2, AlertCircle } from "lucide-react";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loginFn: (pwd: string) => boolean;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  loginFn,
}: AdminLoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginFn(password);
    if (ok) {
      setError(false);
      setPassword("");
      onSuccess();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <span>เข้าสู่โหมดแก้ไข (Admin)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              กรอกรหัสผ่านเพื่อปลดล็อกสิทธิ์แก้ไข
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="รหัสผ่าน Admin..."
              className={`w-full text-sm border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] ${
                error ? "border-[#ED1C24] bg-red-50/30" : "border-gray-300"
              }`}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-[#ED1C24] mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>สำหรับผู้รับผิดชอบข้อมูล เพื่อเพิ่ม, แก้ไข, ลบ Timeline หรือ FAQ</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ยืนยันรหัสผ่าน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
