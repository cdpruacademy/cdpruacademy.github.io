"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Palette, X, RotateCcw, Plus, Trash2, AlertTriangle } from "lucide-react";

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

const PRESET_COLORS = [
  { name: "ฟ้า ttb", hex: "#009FE3" },
  { name: "น้ำเงิน UOB", hex: "#0B2265" },
  { name: "แดง Prudential", hex: "#ED1C24" },
  { name: "ส้ม ttb Accent", hex: "#F37021" },
  { name: "เขียว Emerald", hex: "#10B981" },
  { name: "ม่วง Purple", hex: "#8B5CF6" },
  { name: "ชมพู Rose", hex: "#E11D48" },
  { name: "เทาเข้ม Charcoal", hex: "#334155" },
  { name: "ดำ Slate", hex: "#0F172A" },
];

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
  const [selectedBroker, setSelectedBroker] = useState<string>(brokers[0] || "ttb");
  const [hexInput, setHexInput] = useState<string>("#009FE3");

  // New channel state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelColor, setNewChannelColor] = useState("#8B5CF6");
  const [channelError, setChannelError] = useState("");

  // Deletion warning modal/alert state
  const [deleteWarning, setDeleteWarning] = useState<{
    broker: string;
    usageCount: number;
  } | null>(null);

  useEffect(() => {
    if (!brokers.includes(selectedBroker) && brokers.length > 0) {
      setSelectedBroker(brokers[0]);
    }
  }, [brokers, selectedBroker]);

  useEffect(() => {
    if (currentColors[selectedBroker]) {
      setHexInput(currentColors[selectedBroker]);
    }
  }, [selectedBroker, currentColors]);

  if (!isOpen) return null;

  const handleApplyColor = (hex: string) => {
    setHexInput(hex);
    onColorChange(selectedBroker, hex);
  };

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
    setSelectedBroker(trimmed);
    setHexInput(newChannelColor);
    setNewChannelName("");
    setChannelError("");
    setIsAddingNew(false);
  };

  const initiateDeleteChannel = (brokerToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Count how many project items are currently using this channel
    const usageCount = allProductsBrokers.filter(
      (b) => b.toLowerCase() === brokerToDelete.toLowerCase()
    ).length;

    if (usageCount > 0) {
      // Show warning modal informing that items exist but won't be deleted
      setDeleteWarning({
        broker: brokerToDelete,
        usageCount,
      });
    } else {
      // If not in use, confirm and delete
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
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <span>จัดการ Channel & กำหนดสี</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Channel Selector Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800">
                เลือก Channel ที่ต้องการปรับสี ({brokers.length} ช่องทาง):
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  setChannelError("");
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#ED1C24] hover:text-[#D4181F] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม Channel ใหม่</span>
              </button>
            </div>

            {/* Form for adding a new channel */}
            {isAddingNew && (
              <form
                onSubmit={handleAddNewChannel}
                className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150"
              >
                <div className="text-xs font-bold text-gray-700">เพิ่ม Channel / Broker ใหม่:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => {
                      setNewChannelName(e.target.value);
                      setChannelError("");
                    }}
                    placeholder="เช่น D2C, KBank, SCB..."
                    className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={newChannelColor}
                    onChange={(e) => setNewChannelColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-gray-300 cursor-pointer shrink-0"
                    title="เลือกสี"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-lg shadow-xs shrink-0"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setChannelError("");
                    }}
                    className="px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 border rounded-lg bg-white"
                  >
                    ยกเลิก
                  </button>
                </div>
                {channelError && (
                  <div className="text-[11px] font-semibold text-[#ED1C24]">{channelError}</div>
                )}
              </form>
            )}

            {/* Channels List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {brokers.map((b) => {
                const isSelected = selectedBroker === b;
                const color = currentColors[b] || "#666";
                return (
                  <div
                    key={b}
                    onClick={() => setSelectedBroker(b)}
                    className={`group px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#ED1C24] bg-red-50/40 shadow-xs"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate text-gray-800">[{b}]</span>
                    </div>

                    {/* Delete button (hoverable) */}
                    <button
                      type="button"
                      onClick={(e) => initiateDeleteChannel(b, e)}
                      title={`ลบ Channel [${b}]`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#ED1C24] rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Presets for Selected Broker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800">
                เลือกสีสำหรับ <span className="text-[#ED1C24]">[{selectedBroker}]</span>:
              </label>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>สีปัจจุบัน:</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: currentColors[selectedBroker] || "#666" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleApplyColor(c.hex)}
                  className={`p-2 text-[11px] font-medium rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    hexInput.toLowerCase() === c.hex.toLowerCase()
                      ? "border-black ring-2 ring-black/10 shadow-xs"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shadow-2xs border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[10px] text-gray-600 truncate w-full text-center">
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Hex input with native Color Picker */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600 shrink-0">รหัสสี HEX:</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={hexInput.startsWith("#") ? hexInput : "#009FE3"}
                  onChange={(e) => handleApplyColor(e.target.value)}
                  className="w-7 h-7 p-0 rounded cursor-pointer border border-gray-300"
                  title="จิ้มเลือกสีได้ตามใจชอบ"
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  placeholder="#009FE3"
                  className="w-24 text-xs font-mono border border-gray-300 rounded-lg p-1.5 uppercase"
                />
                <button
                  type="button"
                  onClick={() => handleApplyColor(hexInput)}
                  className="px-2.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-black rounded-lg shadow-xs"
                >
                  ใช้สีนี้
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onResetColors}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              title="คืนค่าสีและช่องทางตั้งต้นทั้งหมด"
            >
              <RotateCcw className="w-3 h-3" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-[#ED1C24] hover:bg-[#D4181F] rounded-xl shadow-sm"
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
