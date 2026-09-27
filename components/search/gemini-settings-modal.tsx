"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { getStoredGeminiKey, saveStoredGeminiKey } from "@/lib/gemini-service";
import { Sparkles, X, CheckCircle2, Key, ExternalLink } from "lucide-react";

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiSettingsModal({ isOpen, onClose }: GeminiSettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredGeminiKey());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredGeminiKey(apiKey);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleClear = () => {
    saveStoredGeminiKey("");
    setApiKey("");
    setSavedSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>ตั้งค่า Google Gemini API</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full text-sm border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
              />
              <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
              <span>สามารถรับ API Key ฟรีได้ที่</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="text-[11px] text-gray-600 bg-slate-50 p-3 rounded-xl border border-gray-200/80 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>การทำงาน:</strong> เมื่อระบุ API Key ระบบจะส่งคำถามไปให้ Gemini
              วิเคราะห์ร่วมกับคลังข้อมูลของทีม เพื่อเรียบเรียงคำตอบที่แม่นยำที่สุด หากไม่มีข้อมูล
              ระบบจะแจ้งเตือนให้บันทึกเป็น FAQ ใหม่
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>บันทึก API Key เรียบร้อยแล้ว!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-[#ED1C24] hover:text-[#D4181F] underline"
              >
                ลบ Key
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-lg shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึก Key</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
