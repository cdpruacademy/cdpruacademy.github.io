"use client"

import * as React from "react"
import { useState } from "react"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { AnnouncementModal } from "./announcement-modal"
import { AnnouncementItem } from "@/lib/announcement-data"
import { Loader2 } from "lucide-react"
import { Eyebrow, PruIcon } from "@/components/pru-icon"
import { toast, confirmAction } from "@/lib/notify"

export function AnnouncementView() {
  // Taken once per visit, so "due" stays stable across re-renders
  const [now] = useState(() => Date.now())
  const { isAdmin } = useAdminAuth()
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
  } = useAnnouncements()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<AnnouncementItem | null>(null)
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null)

  // Format date helper (Thai format)
  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return ""
    try {
      const dt = new Date(isoStr)
      return dt.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return isoStr
    }
  }

  const handleOpenCreate = () => {
    setItemToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: AnnouncementItem) => {
    setItemToEdit(item)
    setIsModalOpen(true)
  }

  const handleSave = async (
    data: Omit<AnnouncementItem, "id" | "createdAt">,
    sendNowImmediately: boolean
  ) => {
    if (itemToEdit) {
      await updateAnnouncement(itemToEdit.id, data, sendNowImmediately)
    } else {
      await addAnnouncement(data, sendNowImmediately)
    }
  }

  const handleBroadcast = async (id: string) => {
    setBroadcastingId(id)
    try {
      await broadcastNow(id)
      toast.success("เข้าคิวแล้ว บอทจะส่งเข้ากลุ่ม LINE ภายใน 5 นาที")
    } catch (err) {
      toast.error("เข้าคิวส่ง LINE ไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setBroadcastingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id)
  }

  const tabs: { key: "all" | "sent" | "pending"; label: string }[] = [
    { key: "all", label: `ทั้งหมด ${stats.total}` },
    { key: "sent", label: `ส่งแล้ว ${stats.sent}` },
    { key: "pending", label: `รอส่ง ${stats.pending + stats.failed}` },
  ]

  const outlineButton =
    "touch-target inline-flex items-center justify-center gap-2 h-11 px-4 border-2 border-rule bg-white text-sm font-bold text-ink hover:border-ink disabled:opacity-50"

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      {/* Header: the headline says what this page does */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <Eyebrow>ประชาสัมพันธ์</Eyebrow>
          <h1 className="m-0 text-[28px] leading-tight font-bold text-ink sm:text-[40px]">
            ข่าวถึงทีม <span className="text-pru-red">ส่งเข้า LINE</span>{" "}
            ให้อัตโนมัติ
          </h1>
          <p className="m-0 text-sm text-ink-soft">
            บอทส่งภายใน 5 นาทีหลังถึงเวลา · เก็บย้อนหลัง 1 ปี
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-11 touch-target items-center gap-2 self-start border-2 border-brand-fill bg-brand-fill px-5 text-[15px] font-bold text-white hover:border-brand-hover hover:bg-brand-hover md:self-auto"
          >
            <PruIcon name="plus" size={18} strokeWidth={4} />
            สร้างประกาศ
          </button>
        )}
      </div>

      {/* Filters and search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="สถานะประกาศ"
          className="flex max-w-full self-start overflow-x-auto border-2 border-rule bg-white"
        >
          {tabs.map((tab) => {
            const selected = filterStatus === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilterStatus(tab.key)}
                className={`h-11 touch-target px-4 text-sm whitespace-nowrap ${selected ? "bg-ink font-bold text-white" : "bg-white text-ink hover:bg-surface"}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="shrink-0">ค้นหา</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="หัวข้อ เนื้อหา หรือผู้ประกาศ"
            className="h-11 w-full border-2 border-rule bg-white px-3 text-[15px] text-ink sm:w-72"
          />
        </label>
      </div>

      {/* List */}
      {!isLoaded ? (
        <div className="border-2 border-rule bg-white p-12 text-center text-sm text-ink-soft">
          <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-pru-red" />
          กำลังโหลดประกาศ...
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 p-12 text-center">
          <PruIcon
            name="megaphone"
            size={44}
            strokeWidth={3}
            className="text-pru-red"
          />
          <h2 className="m-0 text-lg font-bold text-ink">ยังไม่มีประกาศ</h2>
          <p className="m-0 text-sm text-ink-soft">
            {searchQuery
              ? "ไม่พบประกาศที่ตรงกับคำค้นหา ลองใช้คำอื่น"
              : "ยังไม่มีข่าวในรอบ 1 ปีนี้"}
          </p>
          {isAdmin && !searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className={outlineButton}
            >
              <PruIcon name="plus" size={16} strokeWidth={4} />
              สร้างประกาศแรก
            </button>
          )}
        </div>
      ) : (
        <ul className="border-2 border-rule bg-white">
          {announcements.map((item) => {
            const isSent = item.status === "sent"
            const isFailed = item.status === "failed"
            const isDue =
              item.status === "pending" &&
              new Date(item.scheduledAt).getTime() <= now
            const statusLabel = isSent
              ? "ส่งเข้า LINE แล้ว"
              : isFailed
                ? "ส่งไม่สำเร็จ"
                : isDue
                  ? "บอทกำลังส่ง"
                  : "รอส่งตามเวลา"
            const statusIcon = isSent ? "check" : isFailed ? "warning" : "clock"
            const when = isSent
              ? formatDateTime(item.sentAt || item.createdAt)
              : formatDateTime(item.scheduledAt)
            const sendLabel = isSent
              ? "ส่งซ้ำ"
              : isFailed
                ? "ลองส่งอีกครั้ง"
                : "ส่งตอนนี้"

            return (
              <li
                key={item.id}
                className="grid grid-cols-1 gap-3 border-b-2 border-rule px-5 py-5 last:border-b-0 sm:px-7 sm:py-6 md:grid-cols-[170px_1fr_auto] md:gap-6"
              >
                <div className="flex items-center gap-x-3 gap-y-1 md:flex-col md:items-start">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                    <PruIcon
                      name={statusIcon}
                      size={20}
                      className={
                        isFailed
                          ? "text-pru-red"
                          : isSent
                            ? "text-ink"
                            : "text-ink-soft"
                      }
                    />
                    {statusLabel}
                  </span>
                  <span className="text-[13px] text-ink-soft">{when}</span>
                </div>

                <div className="flex min-w-0 gap-4">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="hidden h-20 w-28 shrink-0 border-2 border-rule object-cover sm:block"
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 className="m-0 text-lg leading-snug font-bold text-ink">
                      {item.title}
                    </h2>
                    <p className="m-0 line-clamp-3 text-[15px] whitespace-pre-line text-ink">
                      {item.content}
                    </p>
                    {isFailed && item.sendError && (
                      <p className="m-0 mt-1 bg-pru-red-soft px-3 py-2 text-[13px] text-ink">
                        {item.sendError}
                      </p>
                    )}
                    <span className="text-[13px] text-ink-soft">
                      โดย {item.author}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleBroadcast(item.id)}
                      disabled={broadcastingId === item.id}
                      className={`${outlineButton} ${isFailed ? "border-ink" : ""}`}
                    >
                      {broadcastingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PruIcon name="send" size={16} />
                      )}
                      {sendLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className={outlineButton}
                      aria-label="แก้ไขประกาศ"
                      title="แก้ไขประกาศ"
                    >
                      <PruIcon name="document" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmAction({
                          title: "ลบประกาศนี้?",
                          message: item.title,
                          confirmLabel: "ลบประกาศ",
                          tone: "danger",
                        })
                        if (ok) await handleDelete(item.id)
                      }}
                      className={`${outlineButton} hover:text-brand-ink`}
                      aria-label="ลบประกาศ"
                      title="ลบประกาศ"
                    >
                      <PruIcon name="warning" size={16} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        itemToEdit={itemToEdit}
      />
    </div>
  )
}
