"use client";

import * as React from "react";
import { useState } from "react";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AnnouncementModal } from "./announcement-modal";
import { AnnouncementItem } from "@/lib/announcement-data";
import {
  Sparkles,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Layers,
} from "lucide-react";

export function AnnouncementView() {
  const { isAdmin } = useAdminAuth();
  const {
    announcements,
    allCount,
    stats,
    isLoaded,
    isSaving,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    broadcastNow,
  } = useAnnouncements();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<AnnouncementItem | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Format date helper (Thai format)
  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const handleOpenCreate = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AnnouncementItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleSave = async (
    data: Omit<AnnouncementItem, "id" | "createdAt">,
    sendNowImmediately: boolean
  ) => {
    if (itemToEdit) {
      await updateAnnouncement(itemToEdit.id, data);
      if (sendNowImmediately) {
        await broadcastNow(itemToEdit.id);
      }
    } else {
      await addAnnouncement(data, sendNowImmediately);
    }
  };

  const handleBroadcast = async (id: string) => {
    setBroadcastingId(id);
    try {
      await broadcastNow(id);
      alert("✅ ส่งข้อความประกาศเข้ากลุ่ม LINE เรียบร้อยแล้วครับ!");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการส่งเข้า LINE: " + (err?.message || err));
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ED1C24] to-[#B91C1C] flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#2D2D2D] tracking-tight">
                ข่าวสาร & ประชาสัมพันธ์ทีม (CD Announcements)
              </h1>
              {isAdmin ? (
                <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Admin Mode
                </span>
              ) : (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              ศูนย์รวมข่าวสาร กำหนดการเปิดตัว และแจ้งเตือนของฝ่ายพัฒนาหลักสูตร • จัดเก็บข้อมูลย้อนหลัง 1 ปี
            </p>
          </div>
        </div>

        {/* Stats Summary & Action Button */}
        <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
              รวม {stats.total} ข่าว
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200">
              ส่งแล้ว {stats.sent}
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              รอส่ง {stats.pending}
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ED1C24] hover:bg-[#D4181F] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างประกาศใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterStatus === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-gray-600 hover:bg-slate-200"
            }`}
          >
            ทั้งหมด ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("sent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterStatus === "sent"
                ? "bg-[#06C755] text-white shadow-xs"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ส่งเข้า LINE แล้ว ({stats.sent})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filterStatus === "pending"
                ? "bg-[#0066CC] text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รอส่งตามเวลา ({stats.pending})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามหัวข้อ, เนื้อหา, หรือผู้ประกาศ..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] transition-all bg-gray-50/50 focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Announcements Grid */}
      {!isLoaded ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#ED1C24] mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-500">กำลังโหลดข้อมูลข่าวประชาสัมพันธ์...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-[#ED1C24] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">ไม่พบข่าวประชาสัมพันธ์</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {searchQuery
                ? "ไม่พบรายการที่ตรงกับคำค้นหา ลองค้นหาด้วยคำอื่นดูครับ"
                : "ยังไม่มีข่าวสารในรอบ 1 ปีนี้ คุณสามารถกดปุ่มสร้างประกาศใหม่ได้ทันทีครับ"}
            </p>
          </div>
          {isAdmin && !searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ED1C24] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#D4181F] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างประกาศแรกเลย</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {announcements.map((item) => {
            const isSent = item.status === "sent";
            const authorColor = item.authorColor || "#ED1C24";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Image Banner */}
                  {item.imageUrl && (
                    <div className="w-full h-44 bg-gray-100 overflow-hidden relative border-b border-gray-100">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Status Badge + Timing */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ส่งเข้า LINE แล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          <span>รอส่งตามเวลา</span>
                        </span>
                      )}

                      <span className="text-[10px] font-medium text-gray-400">
                        {isSent
                          ? `ส่งเมื่อ ${formatDateTime(item.sentAt || item.createdAt)}`
                          : `กำหนดส่ง ${formatDateTime(item.scheduledAt)}`}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                      {item.title}
                    </h2>

                    {/* Content */}
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Author + Actions */}
                <div className="p-4 pt-3 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: authorColor }}
                    />
                    <span className="text-xs font-bold text-gray-700 truncate max-w-[130px]">
                      {item.author}
                    </span>
                  </div>

                  {/* Action Buttons for Admin */}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {/* Broadcast Now / Resend */}
                      <button
                        type="button"
                        onClick={() => handleBroadcast(item.id)}
                        disabled={broadcastingId === item.id}
                        title={isSent ? "ส่งซ้ำเข้ากลุ่ม LINE" : "ส่งเข้ากลุ่ม LINE ทันที"}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#06C755] hover:bg-green-50 transition-colors"
                      >
                        {broadcastingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06C755]" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="แก้ไขประกาศ"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-red-200 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded hover:bg-red-700"
                          >
                            ลบ
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-gray-500 px-1 hover:text-gray-800"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item.id)}
                          title="ลบประกาศนี้"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Retention Policy Footer Note */}
      <div className="text-center pt-4 border-t border-gray-200/80">
        <p className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>ระบบจะจัดเก็บข่าวสารและรูปภาพย้อนหลังสูงสุด 1 ปี (365 วัน) โดยรายการที่หมดอายุจะถูกเคลียร์ออกอัตโนมัติ</span>
        </p>
      </div>

      {/* Create / Edit Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        itemToEdit={itemToEdit}
      />
    </div>
  );
}
