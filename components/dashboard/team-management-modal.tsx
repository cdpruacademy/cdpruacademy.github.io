"use client";

import * as React from "react";
import { useState } from "react";
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
} from "lucide-react";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: string[];
  memberColors?: Record<string, string>;
  onAddMember: (name: string, color?: string) => boolean;
  onUpdateMember: (oldName: string, newName: string) => boolean;
  onUpdateMemberColor?: (name: string, color: string) => void;
  onDeleteMember: (name: string) => boolean;
  onResetToDefault: () => void;
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
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberColor, setNewMemberColor] = useState("#ED1C24");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempEditName, setTempEditName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newMemberName.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้รับผิดชอบ");
      return;
    }
    const success = onAddMember(newMemberName.trim(), newMemberColor);
    if (success) {
      setNewMemberName("");
    } else {
      setErrorMessage("มีรายชื่อนี้อยู่ในระบบแล้ว หรือชื่อไม่ถูกต้อง");
    }
  };

  const handleStartEdit = (name: string) => {
    setEditingName(name);
    setTempEditName(name);
    setErrorMessage(null);
  };

  const handleSaveEdit = (oldName: string) => {
    setErrorMessage(null);
    if (!tempEditName.trim()) {
      setErrorMessage("ชื่อต้องไม่เว้นว่าง");
      return;
    }
    const success = onUpdateMember(oldName, tempEditName.trim());
    if (success) {
      setEditingName(null);
    } else {
      setErrorMessage("มีรายชื่อนี้อยู่ในระบบแล้ว หรือไม่สามารถแก้ไขได้");
    }
  };

  const handleDelete = (name: string) => {
    if (teamMembers.length <= 1) {
      setErrorMessage("ต้องมีผู้รับผิดชอบในระบบอย่างน้อย 1 ท่าน");
      return;
    }
    if (confirm(`คุณต้องการลบ "${name}" ออกจากรายชื่อผู้รับผิดชอบหรือไม่?`)) {
      onDeleteMember(name);
      setErrorMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#ED1C24] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                จัดการรายชื่อ & สีประจำตัว (Team Members)
              </h3>
              <p className="text-[11px] text-gray-500">
                เพิ่ม แก้ไขชื่อ และกำหนดสีประจำตัวของคนในทีม
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
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add member form with color picker */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => {
                setNewMemberName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="เช่น Somchai K. หรือ สมชาย"
              className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ED1C24]"
            />
            <div className="relative flex items-center" title="เลือกสีประจำตัว">
              <input
                type="color"
                value={newMemberColor}
                onChange={(e) => setNewMemberColor(e.target.value)}
                className="w-9 h-9 p-0.5 rounded-xl border border-gray-300 cursor-pointer shrink-0"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มคน</span>
            </button>
          </form>

          {/* Members List */}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
              รายชื่อและสีประจำตัว ({teamMembers.length} คน)
            </div>

            {teamMembers.map((member) => {
              const color = memberColors[member] || "#ED1C24";
              return (
                <div
                  key={member}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors"
                >
                  {editingName === member ? (
                    /* Inline Edit Mode */
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={tempEditName}
                        onChange={(e) => setTempEditName(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member)}
                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                        title="บันทึก"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(null)}
                        className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                        title="ยกเลิก"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Normal View Mode */
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Interactive Color Swatch for each member */}
                        <div className="relative shrink-0 flex items-center" title="คลิกเพื่อเปลี่ยนสีประจำตัว">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              if (onUpdateMemberColor) {
                                onUpdateMemberColor(member, e.target.value);
                              }
                            }}
                            className="w-6 h-6 p-0 rounded-full border border-black/10 cursor-pointer shadow-2xs"
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {member}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(member)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-white transition-colors"
                          title="แก้ไขชื่อ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          disabled={teamMembers.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-white transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                          title="ลบออกจากระบบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset to initial button */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm("ต้องการรีเซ็ตรายชื่อคนในทีมและสีกลับเป็นค่าเริ่มต้นหรือไม่?")) {
                  onResetToDefault();
                  setErrorMessage(null);
                }
              }}
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
