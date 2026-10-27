"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { AnnouncementItem } from "@/lib/announcement-data"
import { useTeamMembers } from "@/hooks/use-team-members"
import { uploadAnnouncementImage } from "@/lib/supabase"
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
} from "lucide-react"
import { useDialogA11y } from "@/hooks/use-dialog-a11y"

interface AnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    data: Omit<AnnouncementItem, "id" | "createdAt">,
    sendNowImmediately: boolean
  ) => Promise<void>
  itemToEdit?: AnnouncementItem | null
}

export function AnnouncementModal({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}: AnnouncementModalProps) {
  const { teamMembers, memberColors } = useTeamMembers()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState(teamMembers[0] || "Surakit P.")
  const [deliveryMode, setDeliveryMode] = useState<"immediate" | "scheduled">(
    "immediate"
  )
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("09:00")
  const [imageUrl, setImageUrl] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmSendNow, setConfirmSendNow] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize or reset form
  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title)
      setContent(itemToEdit.content)
      setAuthor(itemToEdit.author)
      setImageUrl(itemToEdit.imageUrl || "")
      if (itemToEdit.status === "pending" && itemToEdit.scheduledAt) {
        setDeliveryMode("scheduled")
        const dt = new Date(itemToEdit.scheduledAt)
        const yyyy = dt.getFullYear()
        const mm = String(dt.getMonth() + 1).padStart(2, "0")
        const dd = String(dt.getDate()).padStart(2, "0")
        const hh = String(dt.getHours()).padStart(2, "0")
        const min = String(dt.getMinutes()).padStart(2, "0")
        setScheduledDate(`${yyyy}-${mm}-${dd}`)
        setScheduledTime(`${hh}:${min}`)
      } else {
        setDeliveryMode("immediate")
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setScheduledDate(tomorrow.toISOString().split("T")[0])
        setScheduledTime("09:00")
      }
    } else {
      setTitle("")
      setContent("")
      setAuthor(teamMembers[0] || "Surakit P.")
      setImageUrl("")
      setDeliveryMode("immediate")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split("T")[0])
      setScheduledTime("09:00")
    }
    setErrorMsg("")
    setConfirmSendNow(false)
    setIsSubmitting(false)
  }, [itemToEdit, isOpen, teamMembers])

  const dialogRef = useDialogA11y(isOpen, onClose)

  if (!isOpen) return null

  // Handle local image file upload to Supabase Storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrorMsg("กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB")
      return
    }

    setIsUploadingImage(true)
    setErrorMsg("")
    try {
      const uploadRes = await uploadAnnouncementImage(file, file.name)
      if (uploadRes.success && uploadRes.url) {
        setImageUrl(uploadRes.url)
      } else {
        setErrorMsg("อัปโหลดรูปภาพไม่สำเร็จ: " + (uploadRes.error || ""))
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการอัปโหลดรูป: " + (err?.message || err))
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg("กรุณาระบุหัวข้อเรื่องประชาสัมพันธ์")
      return
    }
    if (!content.trim()) {
      setErrorMsg("กรุณากรอกเนื้อหาข้อความประชาสัมพันธ์")
      return
    }

    let calculatedScheduledAt = new Date().toISOString()
    if (deliveryMode === "scheduled") {
      if (!scheduledDate) {
        setErrorMsg("กรุณาเลือกวันที่ต้องการตั้งเวลาส่ง")
        return
      }
      const [year, month, day] = scheduledDate.split("-").map(Number)
      const [hour, minute] = scheduledTime.split(":").map(Number)
      const schedDateObj = new Date(
        year,
        month - 1,
        day,
        hour || 0,
        minute || 0
      )

      if (schedDateObj.getTime() <= Date.now()) {
        setErrorMsg("วันและเวลาที่ตั้งส่ง ต้องเป็นเวลาในอนาคตครับ")
        return
      }
      calculatedScheduledAt = schedDateObj.toISOString()
    }

    // If immediate send and not confirmed yet, ask confirmation
    if (deliveryMode === "immediate" && !confirmSendNow) {
      setConfirmSendNow(true)
      return
    }

    setIsSubmitting(true)
    try {
      const sendNow = deliveryMode === "immediate"
      const payload: Omit<AnnouncementItem, "id" | "createdAt"> = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        author,
        authorColor: memberColors[author] || "#ED1C24",
        status: sendNow ? "sent" : "pending",
        scheduledAt: calculatedScheduledAt,
        sentAt: sendNow ? new Date().toISOString() : undefined,
      }

      await onSave(payload, sendNow)
      onClose()
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึก: " + (err?.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const authorColor = memberColors[author] || "#ED1C24"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-xs sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        className="relative my-auto w-full max-w-4xl animate-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95 fade-in"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-fill text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="announcement-modal-title"
                className="text-base leading-tight font-black text-gray-900"
              >
                {itemToEdit
                  ? "แก้ไขข่าวประชาสัมพันธ์"
                  : "สร้างข่าวประชาสัมพันธ์ใหม่ (LINE Bot Broadcast)"}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                โพสต์ข่าวสาร แจ้งเตือนหลักสูตร และส่งการ์ดแจ้งเตือนเข้ากลุ่ม
                LINE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Split Form + Live LINE Flex Preview */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-12"
        >
          {/* Left Form: 7 cols on large screens */}
          <div className="space-y-4 lg:col-span-7">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold tracking-wide text-gray-700 uppercase">
                <span>หัวข้อเรื่องประชาสัมพันธ์ *</span>
                <span className="text-xs text-gray-500">
                  {title.length}/100
                </span>
              </label>
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setConfirmSendNow(false)
                }}
                placeholder="เช่น [แจ้งหลักสูตรใหม่] ttb CI protect พร้อมเปิดระบบ LMS"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-semibold transition-all focus:ring-2 focus:ring-brand focus:outline-none"
                required
              />
            </div>

            {/* Author Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wide text-gray-700 uppercase">
                ผู้ประชาสัมพันธ์ *
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {teamMembers.map((m) => {
                  const isSelected = author === m
                  const color = memberColors[m] || "#ED1C24"
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAuthor(m)}
                      className={`flex items-center gap-1.5 rounded-xl border p-2 text-left text-xs font-bold transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{m}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold tracking-wide text-gray-700 uppercase">
                <span>เนื้อหาข้อความรายละเอียด *</span>
                <span className="text-xs text-gray-500">
                  {content.length}/1000
                </span>
              </label>
              <textarea
                value={content}
                maxLength={1000}
                rows={4}
                onChange={(e) => {
                  setContent(e.target.value)
                  setConfirmSendNow(false)
                }}
                placeholder="ระบุรายละเอียดสำคัญ วันที่ เวลา ลิงก์ดาวน์โหลดเอกสาร หรือสิ่งที่ทีมต้องเตรียมพร้อม..."
                className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-xs leading-relaxed transition-all focus:ring-2 focus:ring-brand focus:outline-none"
                required
              />
            </div>

            {/* Image Attachment */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-bold tracking-wide text-gray-700 uppercase">
                <span>แนบรูปภาพประชาสัมพันธ์ (ถ้ามี)</span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>ลบรูป</span>
                  </button>
                )}
              </label>

              {imageUrl ? (
                <div className="relative flex max-h-36 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-36 w-full object-cover"
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
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-3 text-xs font-semibold text-gray-600 transition-all hover:border-[#ED1C24] hover:bg-red-50/20 hover:text-brand-ink"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-brand-ink" />
                        <span>กำลังอัปโหลดรูปภาพขึ้น Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>
                          คลิกเพื่ออัปโหลดไฟล์รูปภาพ (PNG, JPG ไม่เกิน 5MB)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Timing Options (Immediate vs Scheduled) */}
            <div className="space-y-2 border-t border-gray-100 pt-2">
              <label className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-700 uppercase">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>กำหนดการส่งเข้ากลุ่ม LINE</span>
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Option 1: Send Immediately */}
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all ${
                    deliveryMode === "immediate"
                      ? "border-[#ED1C24] bg-red-50/80 shadow-xs"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="immediate"
                    checked={deliveryMode === "immediate"}
                    onChange={() => {
                      setDeliveryMode("immediate")
                      setConfirmSendNow(false)
                    }}
                    className="mt-0.5 text-brand-ink focus:ring-brand"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-900">
                      <span>ส่งเข้ากลุ่ม LINE ทันที</span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      บอทจะส่ง Flex Card เข้ากลุ่มภายใน 5 นาทีหลังบันทึก
                    </div>
                  </div>
                </label>

                {/* Option 2: Schedule for Future */}
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all ${
                    deliveryMode === "scheduled"
                      ? "border-ink bg-surface"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="scheduled"
                    checked={deliveryMode === "scheduled"}
                    onChange={() => {
                      setDeliveryMode("scheduled")
                      setConfirmSendNow(false)
                    }}
                    className="mt-0.5 text-ink focus:ring-brand"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-900">
                      <span>ตั้งเวลาส่งล่วงหน้า</span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      ระบุวันและเวลาที่ต้องการให้บอทเริ่มส่ง
                    </div>
                  </div>
                </label>
              </div>

              {/* Date & Time Picker when Scheduled */}
              {deliveryMode === "scheduled" && (
                <div className="grid animate-in grid-cols-2 gap-2 rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 duration-200 fade-in">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>วันที่ส่ง</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-brand focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
                      <Clock className="h-3 w-3 text-blue-600" />
                      <span>เวลาที่ส่ง</span>
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-brand focus:outline-none"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live LINE Flex Card Preview (5 cols) */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-gray-200/80 bg-[#EEF2F5]/60 p-4 lg:col-span-5">
            <div>
              <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2 text-xs font-bold text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#06C755]" />
                  <span>LINE Flex Message Preview</span>
                </span>
                <span className="text-xs text-gray-500">จำลองหน้าจอ LINE</span>
              </div>

              {/* Simulated LINE Bubble */}
              <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-gray-200/70 bg-white font-sans shadow-md">
                {/* Banner Image */}
                {imageUrl ? (
                  <div className="h-36 w-full overflow-hidden bg-gray-100">
                    <img
                      src={imageUrl}
                      alt="Banner"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-full items-center justify-center bg-gradient-to-r from-[#ED1C24] to-[#B91C1C] text-white/90">
                    <span className="flex items-center gap-1 text-xs font-black tracking-wider uppercase">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>PRUDENTIAL CD TEAM</span>
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="space-y-2 p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded bg-brand-fill px-1.5 py-0.5 text-xs font-black tracking-wide text-white uppercase">
                      📢 CD PR NEWS
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {deliveryMode === "immediate"
                        ? "ส่งทันที"
                        : `${scheduledDate} ${scheduledTime}`}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-xs leading-snug font-black text-gray-900">
                    {title || "หัวข้อข่าวประชาสัมพันธ์จะแสดงตรงนี้"}
                  </h3>

                  <p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-line text-gray-600">
                    {content ||
                      "ข้อความรายละเอียดข่าวสาร วัน เวลา และข้อมูลสำคัญจะจัดแสดงในการ์ดนี้..."}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: authorColor }}
                      />
                      <span className="font-bold text-gray-700">{author}</span>
                    </div>
                    <span className="font-medium text-gray-500">
                      Curriculum Dev
                    </span>
                  </div>

                  {/* Card Button */}
                  <div className="pt-1">
                    <div className="w-full rounded-lg border border-blue-200 bg-blue-50/80 py-1.5 text-center text-xs font-bold text-[#0066CC]">
                      เปิดดูบน Dashboard ↗
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 border-t border-gray-200/80 pt-3">
              {confirmSendNow && deliveryMode === "immediate" ? (
                <div className="animate-in space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 duration-150 fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>ยืนยันการส่งข้อความเข้ากลุ่ม LINE หรือไม่?</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    บอทจะส่งข้อความและรูปภาพเข้ากลุ่มภายใน 5 นาที
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmSendNow(false)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex flex-1 items-center justify-center gap-1 bg-brand-fill px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-hover"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
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
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex h-11 touch-target items-center gap-2 px-5 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                      deliveryMode === "immediate"
                        ? "bg-brand-fill hover:bg-brand-hover"
                        : "bg-brand-fill hover:bg-brand-hover"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : deliveryMode === "immediate" ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    <span>
                      {deliveryMode === "immediate"
                        ? "ส่งเข้า LINE ทันที"
                        : "บันทึกและตั้งเวลาส่ง"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
