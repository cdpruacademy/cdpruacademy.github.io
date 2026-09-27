"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { parseUploadedDataFile } from "@/lib/excel-service";
import { ProductItem } from "@/lib/timeline-data";
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Info } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (items: ProductItem[]) => void;
  timelineTitle: string;
}

export function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  timelineTitle,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const items = await parseUploadedDataFile(file);
      onImportSuccess(items);
      onClose();
    } catch (err: any) {
      console.error("Import failed", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการนำเข้าไฟล์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
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
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <span>นำเข้าข้อมูล ({timelineTitle})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#ED1C24] bg-red-50/50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-2xs mx-auto flex items-center justify-center text-gray-500 mb-3">
              <FileSpreadsheet className="w-6 h-6 text-[#ED1C24]" />
            </div>
            <p className="text-sm font-bold text-gray-800">
              {isLoading ? "กำลังประมวลผลไฟล์..." : "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              รองรับไฟล์ Excel (.xlsx, .xls) หรือ JSON
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-[#ED1C24] bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-[11px] text-gray-500 bg-slate-50 p-3 rounded-lg border border-gray-100 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong>วิธีใช้:</strong> คุณสามารถกดดาวน์โหลดไฟล์ Excel หรือ JSON จากหน้าเว็บ
              แล้วนำไปแก้ไขข้อมูลในเครื่อง จากนั้นลากไฟล์กลับเข้ามาที่นี่เพื่ออัปเดตข้อมูลบนหน้าจอได้ทันที
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
