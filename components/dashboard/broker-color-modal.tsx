"use client";

import * as React from "react";
import { useState } from "react";
import { Palette, X, RotateCcw, Plus, Trash2, AlertTriangle, AlertCircle } from "lucide-react";

interface BrokerColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorChange: (broker: string, hexColor: string) => void;
  onAddChannel: (broker: string, hexColor: string) => void;
  onDeleteChannel: (broker: string) => void;
  onResetColors: () => void;
  currentColors: Record<string, string>;
  allProductsBrokers?: string[]; // All brokers currently in use in projects
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
  const brokers = Object.keys(currentColors);

  // New channel state
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelColor, setNewChannelColor] = useState("#009FE3");
  const [channelError, setChannelError] = useState("");

  // Deletion warning modal/alert state
  const [deleteWarning, setDeleteWarning] = useState<{
    broker: string;
    usageCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleAddNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChannelName.trim();
    if (!trimmed) {
      setChannelError("กรุณาระบุชื่อ Channel / Broker");
      return;
    }
    if (brokers.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setChannelError("Channel นี้มีอยู่ในระบบแล้ว");
      return;
    }
    onAddChannel(trimmed, newChannelColor);
    setNewChannelName("");
    setChannelError("");
  };

  const initiateDeleteChannel = (brokerToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Count how many project items are currently using this channel
    const usageCount = allProductsBrokers.filter(
      (b) => b.toLowerCase() === brokerToDelete.toLowerCase()
    ).length;

    if (usageCount > 0) {
      setDeleteWarning({
        broker: brokerToDelete,
        usageCount,
      });
    } else {
      if (confirm(`คุณต้องการลบ Channel [${brokerToDelete}] ใช่หรือไม่?`)) {
        onDeleteChannel(brokerToDelete);
      }
    }
  };

  const confirmDeleteChannelWithWarning = () => {
    if (!deleteWarning) return;
    onDeleteChannel(deleteWarning.broker);
    setDeleteWarning(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                จัดการ Channel & สีประจำช่องทาง
              </h3>
              <p className="text-[11px] text-gray-500">
                คลิกที่วงกลมสีเพื่อเปลี่ยนสี หรือเพิ่ม/ลบ Channel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error notice */}
          {channelError && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-[#ED1C24] text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{channelError}</span>
            </div>
          )}

          {/* Add Channel Form */}
          <form onSubmit={handleAddNewChannel} className="flex items-center gap-2">
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => {
                setNewChannelName(e.target.value);
                if (channelError) setChannelError("");
              }}
              placeholder="เช่น D2C, KBank, SCB..."
              className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
            />
            <div
              className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-black/15 shadow-2xs cursor-pointer flex items-center justify-center hover:scale-105 transition-transform"
              title="เลือกสีประจำช่องทาง"
            >
              <span
                className="w-full h-full rounded-full pointer-events-none"
                style={{ backgroundColor: newChannelColor }}
              />
              <input
                type="color"
                value={newChannelColor}
                onChange={(e) => setNewChannelColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </form>

          {/* Channels List */}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
              ช่องทางและสี ({brokers.length} ช่องทาง)
            </div>

            {brokers.map((b) => {
              const color = currentColors[b] || "#64748B";
              return (
                <div
                  key={b}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Interactive Color Swatch for each channel */}
                    <div
                      className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border border-black/15 shadow-2xs cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                      title="คลิกเพื่อเปลี่ยนสี"
                    >
                      <span
                        className="w-full h-full rounded-full pointer-events-none"
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => onColorChange(b, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {b}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => initiateDeleteChannel(b, e)}
                    title={`ลบ Channel [${b}]`}
                    className="p-1.5 text-gray-400 hover:text-[#ED1C24] hover:bg-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onResetColors}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              title="คืนค่าสีและช่องทางตั้งต้นทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-xl shadow-xs transition-colors"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
            onClick={() => setDeleteWarning(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl z-20 p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>แจ้งเตือน Channel มีข้อมูลใช้งานอยู่</span>
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              Channel <strong className="text-gray-900">[{deleteWarning.broker}]</strong> มีโปรเจกต์ในระบบกำลังใช้งานอยู่จำนวน{" "}
              <strong className="text-[#ED1C24]">{deleteWarning.usageCount} รายการ</strong>
              <div className="mt-2 p-2 bg-amber-50 rounded-lg text-amber-800 text-[11px]">
                🛡️ <strong>ระบบจะลบเฉพาะ Channel นี้ออกจากเมนูตัวเลือก</strong> โดยจะไม่ลบหรือเปลี่ยนแปลงข้อมูลโปรเจกต์ในตารางเดิมครับ
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteWarning(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteChannelWithWarning}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-lg shadow-xs"
              >
                ยืนยันลบออกจากเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
