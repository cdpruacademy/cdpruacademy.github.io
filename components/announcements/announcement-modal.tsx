"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { AnnouncementItem } from "@/lib/announcement-data";
import { useTeamMembers } from "@/hooks/use-team-members";
import { uploadAnnouncementImage } from "@/lib/supabase";
import {
  X,
  Upload,
  Send,
  Clock,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
} from "lucide-react";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<AnnouncementItem, "id" | "createdAt">,
    sendNowImmediately: boolean
  ) => Promise<void>;
  itemToEdit?: AnnouncementItem | null;
}

export function AnnouncementModal({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}: AnnouncementModalProps) {
  const { teamMembers, memberColors } = useTeamMembers();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState(teamMembers[0] || "Surakit P.");
  const [deliveryMode, setDeliveryMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmSendNow, setConfirmSendNow] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title);
      setContent(itemToEdit.content);
      setAuthor(itemToEdit.author);
      setImageUrl(itemToEdit.imageUrl || "");
      if (itemToEdit.status === "pending" && itemToEdit.scheduledAt) {
        setDeliveryMode("scheduled");
        const dt = new Date(itemToEdit.scheduledAt);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        const hh = String(dt.getHours()).padStart(2, "0");
        const min = String(dt.getMinutes()).padStart(2, "0");
        setScheduledDate(`${yyyy}-${mm}-${dd}`);
        setScheduledTime(`${hh}:${min}`);
      } else {
        setDeliveryMode("immediate");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduledDate(tomorrow.toISOString().split("T")[0]);
        setScheduledTime("09:00");
      }
    } else {
      setTitle("");
      setContent("");
      setAuthor(teamMembers[0] || "Surakit P.");
      setImageUrl("");
      setDeliveryMode("immediate");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("09:00");
    }
    setErrorMsg("");
    setConfirmSendNow(false);
    setIsSubmitting(false);
  }, [itemToEdit, isOpen, teamMembers]);

  if (!isOpen) return null;

  // Handle local image file upload to Supabase Storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg("");
    try {
      const uploadRes = await uploadAnnouncementImage(file, file.name);
      if (uploadRes.success && uploadRes.url) {
        setImageUrl(uploadRes.url);
      } else {
        setErrorMsg("อัปโหลดรูปภาพไม่สำเร็จ: " + (uploadRes.error || ""));
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการอัปโหลดรูป: " + (err?.message || err));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("กรุณาระบุหัวข้อเรื่องประชาสัมพันธ์");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("กรุณากรอกเนื้อหาข้อความประชาสัมพันธ์");
      return;
    }

    let calculatedScheduledAt = new Date().toISOString();
    if (deliveryMode === "scheduled") {
      if (!scheduledDate) {
        setErrorMsg("กรุณาเลือกวันที่ต้องการตั้งเวลาส่ง");
        return;
      }
      const [year, month, day] = scheduledDate.split("-").map(Number);
      const [hour, minute] = scheduledTime.split(":").map(Number);
      const schedDateObj = new Date(year, month - 1, day, hour || 0, minute || 0);

      if (schedDateObj.getTime() <= Date.now()) {
        setErrorMsg("วันและเวลาที่ตั้งส่ง ต้องเป็นเวลาในอนาคตครับ");
        return;
      }
      calculatedScheduledAt = schedDateObj.toISOString();
    }

    // If immediate send and not confirmed yet, ask confirmation
    if (deliveryMode === "immediate" && !confirmSendNow) {
      setConfirmSendNow(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const sendNow = deliveryMode === "immediate";
      const payload: Omit<AnnouncementItem, "id" | "createdAt"> = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        author,
        authorColor: memberColors[author] || "#ED1C24",
        status: sendNow ? "sent" : "pending",
        scheduledAt: calculatedScheduledAt,
        sentAt: sendNow ? new Date().toISOString() : undefined,
      };

      await onSave(payload, sendNow);
      onClose();
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึก: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorColor = memberColors[author] || "#ED1C24";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ED1C24] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-tight">
                {itemToEdit ? "แก้ไขข่าวประชาสัมพันธ์" : "สร้างข่าวประชาสัมพันธ์ใหม่ (LINE Bot Broadcast)"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                โพสต์ข่าวสาร แจ้งเตือนหลักสูตร และส่งการ์ดแจ้งเตือนเข้ากลุ่ม LINE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Form + Live LINE Flex Preview */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols on large screens */}
          <div className="lg:col-span-7 space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                <span>หัวข้อเรื่องประชาสัมพันธ์ *</span>
                <span className="text-[10px] text-gray-400">{title.length}/100</span>
              </label>
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setConfirmSendNow(false);
                }}
                placeholder="เช่น [แจ้งหลักสูตรใหม่] ttb CI protect พร้อมเปิดระบบ LMS"
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] transition-all"
                required
              />
            </div>

            {/* Author Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                ผู้ประชาสัมพันธ์ *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {teamMembers.map((m) => {
                  const isSelected = author === m;
                  const color = memberColors[m] || "#ED1C24";
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAuthor(m)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                <span>เนื้อหาข้อความรายละเอียด *</span>
                <span className="text-[10px] text-gray-400">{content.length}/1000</span>
              </label>
              <textarea
                value={content}
                maxLength={1000}
                rows={4}
                onChange={(e) => {
                  setContent(e.target.value);
                  setConfirmSendNow(false);
                }}
                placeholder="ระบุรายละเอียดสำคัญ วันที่ เวลา ลิงก์ดาวน์โหลดเอกสาร หรือสิ่งที่ทีมต้องเตรียมพร้อม..."
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] transition-all resize-y leading-relaxed"
                required
              />
            </div>

            {/* Image Attachment */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                <span>แนบรูปภาพประชาสัมพันธ์ (ถ้ามี)</span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบรูป</span>
                  </button>
                )}
              </label>

              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-36 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-36 object-cover"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 hover:border-[#ED1C24] rounded-xl text-xs font-semibold text-gray-600 hover:text-[#ED1C24] bg-gray-50/50 hover:bg-red-50/20 transition-all cursor-pointer"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#ED1C24]" />
                        <span>กำลังอัปโหลดรูปภาพขึ้น Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>คลิกเพื่ออัปโหลดไฟล์รูปภาพ (PNG, JPG ไม่เกิน 5MB)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Timing Options (Immediate vs Scheduled) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>กำหนดการส่งเข้ากลุ่ม LINE</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option 1: Send Immediately */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    deliveryMode === "immediate"
                      ? "bg-red-50/80 border-[#ED1C24] shadow-xs"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="immediate"
                    checked={deliveryMode === "immediate"}
                    onChange={() => {
                      setDeliveryMode("immediate");
                      setConfirmSendNow(false);
                    }}
                    className="mt-0.5 text-[#ED1C24] focus:ring-[#ED1C24]"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <span>⚡ ส่งเข้ากลุ่ม LINE ทันที</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      บอทจะส่ง Flex Card เข้ากลุ่มทันทีที่บันทึก
                    </div>
                  </div>
                </label>

                {/* Option 2: Schedule for Future */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    deliveryMode === "scheduled"
                      ? "bg-blue-50/80 border-[#0066CC] shadow-xs"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="scheduled"
                    checked={deliveryMode === "scheduled"}
                    onChange={() => {
                      setDeliveryMode("scheduled");
                      setConfirmSendNow(false);
                    }}
                    className="mt-0.5 text-[#0066CC] focus:ring-[#0066CC]"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <span>⏰ ตั้งเวลาส่งล่วงหน้า</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      ระบุวันและเวลาที่ต้องการให้บอทเริ่มส่ง
                    </div>
                  </div>
                </label>
              </div>

              {/* Date & Time Picker when Scheduled */}
              {deliveryMode === "scheduled" && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>วันที่ส่ง</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>เวลาที่ส่ง</span>
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live LINE Flex Card Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-[#EEF2F5]/60 p-4 rounded-2xl border border-gray-200/80">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 text-xs font-bold text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06C755]" />
                  <span>LINE Flex Message Preview</span>
                </span>
                <span className="text-[10px] text-gray-400">จำลองหน้าจอ LINE</span>
              </div>

              {/* Simulated LINE Bubble */}
              <div className="w-full max-w-[320px] mx-auto bg-white rounded-2xl shadow-md border border-gray-200/70 overflow-hidden font-sans">
                {/* Banner Image */}
                {imageUrl ? (
                  <div className="w-full h-36 bg-gray-100 overflow-hidden">
                    <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-16 bg-gradient-to-r from-[#ED1C24] to-[#B91C1C] flex items-center justify-center text-white/90">
                    <span className="text-xs font-black tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>PRUDENTIAL CD TEAM</span>
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-black text-white bg-[#ED1C24] px-1.5 py-0.5 rounded tracking-wide uppercase">
                      📢 CD PR NEWS
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {deliveryMode === "immediate" ? "ส่งทันที" : `${scheduledDate} ${scheduledTime}`}
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-gray-900 leading-snug line-clamp-2">
                    {title || "หัวข้อข่าวประชาสัมพันธ์จะแสดงตรงนี้"}
                  </h3>

                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                    {content || "ข้อความรายละเอียดข่าวสาร วัน เวลา และข้อมูลสำคัญจะจัดแสดงในการ์ดนี้..."}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: authorColor }} />
                      <span className="font-bold text-gray-700">{author}</span>
                    </div>
                    <span className="text-gray-400 font-medium">Curriculum Dev</span>
                  </div>

                  {/* Card Button */}
                  <div className="pt-1">
                    <div className="w-full py-1.5 text-center text-[10px] font-bold text-[#0066CC] bg-blue-50/80 rounded-lg border border-blue-200">
                      เปิดดูบน Dashboard ↗
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-200/80 space-y-2">
              {confirmSendNow && deliveryMode === "immediate" ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ยืนยันการส่งข้อความเข้ากลุ่ม LINE หรือไม่?</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    บอทจะส่งข้อความและรูปภาพเข้ากลุ่มสมาชิกทันที
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmSendNow(false)}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 px-3 text-xs font-bold text-white bg-[#06C755] hover:bg-[#05963F] rounded-lg shadow-xs flex items-center justify-center gap-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>ยืนยันส่งทันที</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-all ${
                      deliveryMode === "immediate"
                        ? "bg-[#06C755] hover:bg-[#05963F]"
                        : "bg-[#0066CC] hover:bg-[#0052A3]"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : deliveryMode === "immediate" ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>
                      {deliveryMode === "immediate" ? "ส่งเข้า LINE ทันที" : "บันทึกและตั้งเวลาส่ง"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
