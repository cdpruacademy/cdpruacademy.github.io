"use client"

import * as React from "react"
import { useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { AnnouncementItem } from "@/lib/announcement-data"
import { useTeamMembers } from "@/hooks/use-team-members"
import { uploadAnnouncementImage } from "@/lib/supabase"
import { Icon, type IconName } from "@/components/icon"
import { cardButton } from "@/components/page-hero"
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

const TITLE_MAX = 80
const CONTENT_MAX = 1000

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const pad = (n: number) => String(n).padStart(2, "0")
const dateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Start values: the item being edited, or a blank announcement scheduled for tomorrow 09:00 */
function initialSchedule(item?: AnnouncementItem | null) {
  if (item?.status === "pending" && item.scheduledAt) {
    const dt = new Date(item.scheduledAt)
    return {
      mode: "scheduled" as const,
      date: dateValue(dt),
      time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    }
  }
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { mode: "immediate" as const, date: dateValue(tomorrow), time: "09:00" }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()

function Section({
  icon,
  title,
  htmlFor,
  aside,
  children,
}: {
  icon: IconName
  title: string
  htmlFor?: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  const Heading = htmlFor ? "label" : "p"
  return (
    <div className="flex flex-col gap-2.5">
      <Heading htmlFor={htmlFor} className="flex items-center gap-2.5 text-[15px] font-bold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pru-red-soft text-brand-ink">
          <Icon name={icon} size={15} strokeWidth={2} />
        </span>
        {title}
        {aside && <span className="ml-auto text-xs font-medium text-ink-soft">{aside}</span>}
      </Heading>
      {children}
    </div>
  )
}

const fieldClass =
  "w-full rounded-[14px] border-[1.5px] border-rule bg-white px-3.5 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"

/**
 * Add / edit an announcement. Opens from the right like the project form.
 * The parent mounts it only while open (with a key per item), so the form starts
 * from its props and never resets itself while the user types.
 */
export function AnnouncementModal({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}: AnnouncementModalProps) {
  const { teamMembers, memberColors } = useTeamMembers()
  const start = initialSchedule(itemToEdit)

  const [title, setTitle] = useState(itemToEdit?.title ?? "")
  const [content, setContent] = useState(itemToEdit?.content ?? "")
  const [author, setAuthor] = useState(itemToEdit?.author ?? (teamMembers[0] || "Surakit P."))
  const [deliveryMode, setDeliveryMode] = useState<"immediate" | "scheduled">(start.mode)
  const [scheduledDate, setScheduledDate] = useState(start.date)
  const [scheduledTime, setScheduledTime] = useState(start.time)
  const [imageUrl, setImageUrl] = useState(itemToEdit?.imageUrl || "")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmSendNow, setConfirmSendNow] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useDialogA11y<HTMLFormElement>(isOpen, onClose)

  if (!isOpen) return null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrorMsg("เลือกไฟล์รูปได้เฉพาะ PNG, JPG หรือ WebP")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("รูปต้องมีขนาดไม่เกิน 5 MB")
      return
    }
    setIsUploadingImage(true)
    setErrorMsg("")
    try {
      const uploadRes = await uploadAnnouncementImage(file, file.name)
      if (uploadRes.success && uploadRes.url) {
        setImageUrl(uploadRes.url)
      } else {
        setErrorMsg("อัปโหลดรูปไม่สำเร็จ: " + (uploadRes.error || ""))
      }
    } catch (err) {
      setErrorMsg("อัปโหลดรูปไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg("ใส่หัวข้อประกาศก่อน")
      return
    }
    if (!content.trim()) {
      setErrorMsg("ใส่ข้อความประกาศก่อน")
      return
    }

    let calculatedScheduledAt = new Date().toISOString()
    if (deliveryMode === "scheduled") {
      if (!scheduledDate) {
        setErrorMsg("เลือกวันที่จะส่งก่อน")
        return
      }
      const [year, month, day] = scheduledDate.split("-").map(Number)
      const [hour, minute] = scheduledTime.split(":").map(Number)
      const schedDateObj = new Date(year, month - 1, day, hour || 0, minute || 0)
      if (schedDateObj.getTime() <= Date.now()) {
        setErrorMsg("วันและเวลาที่ตั้งส่งต้องอยู่ในอนาคต")
        return
      }
      calculatedScheduledAt = schedDateObj.toISOString()
    }

    // Sending now goes straight to the group, so ask once more
    if (deliveryMode === "immediate" && !confirmSendNow) {
      setConfirmSendNow(true)
      return
    }

    setIsSubmitting(true)
    try {
      const sendNow = deliveryMode === "immediate"
      await onSave(
        {
          title: title.trim(),
          content: content.trim(),
          imageUrl: imageUrl.trim() || undefined,
          author,
          authorColor: memberColors[author] || "#ED1B2E",
          status: sendNow ? "sent" : "pending",
          scheduledAt: calculatedScheduledAt,
          sentAt: sendNow ? new Date().toISOString() : undefined,
        },
        sendNow
      )
      onClose()
    } catch (err) {
      setErrorMsg("บันทึกไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsSubmitting(false)
    }
  }

  const authorColor = memberColors[author] || "#ED1B2E"
  const scheduleLabel = (() => {
    if (deliveryMode === "immediate") return "ส่งทันทีที่กด"
    const [y, m, d] = scheduledDate.split("-").map(Number)
    if (!y) return "เลือกวันและเวลา"
    const when = new Date(y, m - 1, d).toLocaleDateString("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    return `ส่ง ${when} ${scheduledTime}`
  })()

  const modeOptions = [
    { value: "immediate" as const, label: "Send now", icon: "send" as const },
    { value: "scheduled" as const, label: "Schedule", icon: "calendar" as const },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-ink/25" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
          onSubmit={handleSubmit}
          className="flex h-full w-screen max-w-[560px] animate-in flex-col bg-white shadow-[-24px_0_64px_-24px_rgba(28,25,23,0.35)] duration-200 slide-in-from-right"
        >
          <header className="flex items-center gap-3 border-b border-rule py-4 pr-4 pl-5 sm:pl-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pru-red text-white">
              <Icon name={itemToEdit ? "edit" : "megaphone"} size={20} />
            </span>
            <div className="flex-1">
              <h2 id="announcement-modal-title" className="text-xl leading-tight font-bold text-ink">
                {itemToEdit ? "Edit announcement" : "New announcement"}
              </h2>
              <p className="text-[13px] text-ink-soft">CODY จะส่งเข้ากลุ่ม LINE ของทีม</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
            >
              <Icon name="close" size={20} strokeWidth={2} />
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 sm:px-6">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-[14px] bg-pru-red-soft px-3 py-2.5 text-[13px] text-brand-ink"
              >
                <Icon name="warning" size={16} strokeWidth={2} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Section icon="edit" title="Title" htmlFor="announcement-title" aside={`${title.length} / ${TITLE_MAX}`}>
              <input
                id="announcement-title"
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ttb CI protect พร้อมเปิดใน LMS แล้ว"
                className={`${fieldClass} h-[46px]`}
              />
            </Section>

            <Section icon="user" title="From">
              <div className="flex flex-wrap gap-2">
                {teamMembers.map((m) => {
                  const on = m === author
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAuthor(m)}
                      aria-pressed={on}
                      className={`touch-target inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] pr-3.5 pl-1.5 text-sm font-semibold transition-colors ${
                        on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:bg-surface"
                      }`}
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: memberColors[m] || "#ED1B2E" }}
                      >
                        {initials(m)}
                      </span>
                      {m}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section
              icon="draft"
              title="Message"
              htmlFor="announcement-content"
              aside={`${content.length} / ${CONTENT_MAX}`}
            >
              <textarea
                id="announcement-content"
                rows={5}
                value={content}
                maxLength={CONTENT_MAX}
                onChange={(e) => setContent(e.target.value)}
                placeholder="รายละเอียด วันที่ เวลา ลิงก์เอกสาร หรือสิ่งที่ทีมต้องเตรียม"
                className={`${fieldClass} resize-none py-2.5 leading-relaxed`}
              />
            </Section>

            <Section
              icon="image"
              title="Image"
              aside={
                imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"
                  >
                    <Icon name="trash" size={13} strokeWidth={2} />
                    Remove
                  </button>
                ) : (
                  "ไม่ใส่ก็ได้"
                )
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="รูปที่แนบ" className="h-40 w-full rounded-2xl object-cover" />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex h-24 items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-paper text-sm text-stone-700 transition-colors hover:border-pru-red disabled:cursor-wait"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-ink">
                    {isUploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon name="download" size={20} strokeWidth={2} className="rotate-180" />
                    )}
                  </span>
                  <span className="text-left">
                    <b>{isUploadingImage ? "กำลังอัปโหลด…" : "กดเลือกรูป"}</b>
                    <br />
                    <span className="text-xs text-ink-soft">PNG / JPG / WebP ไม่เกิน 5 MB</span>
                  </span>
                </button>
              )}
            </Section>

            <Section icon="inProgress" title="When">
              <div role="radiogroup" aria-label="When" className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
                {modeOptions.map((o) => {
                  const on = deliveryMode === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setDeliveryMode(o.value)
                        setConfirmSendNow(false)
                      }}
                      className={`touch-target inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${
                        on ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      <Icon name={o.icon} size={16} strokeWidth={2} />
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {deliveryMode === "scheduled" && (
                <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
                  <span className="flex flex-col gap-1.5">
                    <label htmlFor="announcement-date" className="text-[13px] font-bold text-stone-700">
                      Date
                    </label>
                    <input
                      id="announcement-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className={`${fieldClass} h-[46px]`}
                    />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <label htmlFor="announcement-time" className="text-[13px] font-bold text-stone-700">
                      Time
                    </label>
                    <input
                      id="announcement-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className={`${fieldClass} h-[46px]`}
                    />
                  </span>
                </div>
              )}
            </Section>

            <Section icon="eye" title="Preview ใน LINE">
              <div className="flex items-start gap-2.5 rounded-[18px] bg-[#8CABD9] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${BASE_PATH}/cody/cody-logo.png`} alt="" className="h-[34px] w-[34px] shrink-0 rounded-[10px]" />
                <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white">
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-32 w-full object-cover" />
                  )}
                  <div className="bg-pru-red px-3.5 py-3 text-white">
                    <span className="text-[11px] font-bold tracking-[0.06em]">ANNOUNCEMENT</span>
                    <div className="mt-0.5 text-base leading-snug font-bold">
                      {title || "หัวข้อประกาศ"}
                    </div>
                  </div>
                  <p className="line-clamp-6 px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-line text-stone-700">
                    {content || "ข้อความประกาศจะแสดงตรงนี้"}
                  </p>
                  <div className="flex items-center gap-1.5 px-3.5 pb-3 text-xs text-ink-soft">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: authorColor }}
                    >
                      {initials(author)}
                    </span>
                    {author}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <footer className="border-t border-rule px-5 pt-4 pb-5 sm:px-6">
            {confirmSendNow && deliveryMode === "immediate" ? (
              <div className="flex animate-in flex-col gap-3 rounded-2xl bg-pru-red-soft p-3.5 duration-150 fade-in">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="send" size={18} strokeWidth={2} className="text-brand-ink" />
                  ส่งเข้ากลุ่ม LINE ตอนนี้เลยไหม?
                </p>
                <p className="text-[13px] text-ink-soft">CODY จะส่งข้อความเข้ากลุ่มภายใน 5 นาที</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSendNow(false)}
                    className={`${cardButton} h-11 justify-center`}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="touch-target inline-flex h-11 items-center justify-center gap-2 rounded-full bg-pru-red text-sm font-bold text-white hover:brightness-95 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={16} />}
                    Send now
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="flex-1 text-[13px] text-ink-soft">{scheduleLabel}</span>
                <button type="button" onClick={onClose} className={`${cardButton} h-[46px] px-5`}>
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="touch-target inline-flex h-[46px] items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon name={deliveryMode === "immediate" ? "send" : "calendar"} size={16} />
                  )}
                  {deliveryMode === "immediate" ? "Send to LINE" : "Schedule"}
                </button>
              </div>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}
