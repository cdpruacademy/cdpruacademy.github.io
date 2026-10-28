"use client"

import * as React from "react"
import { useState } from "react"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { AnnouncementModal } from "./announcement-modal"
import { AnnouncementItem } from "@/lib/announcement-data"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import {
  PageBody,
  PageHero,
  card,
  cardButton,
  heroButtonSolid,
} from "@/components/page-hero"
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
    { key: "all", label: `All ${stats.total}` },
    { key: "sent", label: `Sent ${stats.sent}` },
    { key: "pending", label: `Scheduled ${stats.pending + stats.failed}` },
  ]

  const iconButton =
    "touch-target inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink disabled:opacity-50"

  return (
    <div>
      <PageHero>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">Announcements</h1>
            <p className="mt-2 text-base">
              ข่าวถึงทีม ส่งเข้ากลุ่ม LINE ให้อัตโนมัติ · บอทส่งภายใน 5 นาทีหลังถึงเวลา · เก็บย้อนหลัง 1 ปี
            </p>
          </div>
          <div className="flex items-end gap-7">
            <div>
              <div className="text-sm">Sent</div>
              <div className="text-[44px] leading-none font-bold">{stats.sent}</div>
            </div>
            <div>
              <div className="text-sm">Scheduled</div>
              <div className="text-[44px] leading-none font-bold">{stats.pending + stats.failed}</div>
            </div>
            {isAdmin && (
              <button type="button" onClick={handleOpenCreate} className={heroButtonSolid}>
                <Icon name="plus" size={18} strokeWidth={2.2} />
                New announcement
              </button>
            )}
          </div>
        </div>
      </PageHero>

      <PageBody className="flex flex-col gap-4">
        <div className={`${card} flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center`}>
          <div role="tablist" aria-label="Announcement status" className="flex gap-0.5 self-start rounded-full bg-surface p-1">
            {tabs.map((tab) => {
              const selected = filterStatus === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`touch-target h-9 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${selected ? "bg-white text-ink shadow-[var(--shadow-card)]" : "text-ink-soft hover:text-ink"}`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <label className="flex h-10 items-center gap-2 rounded-full border border-rule px-3.5 text-ink-soft sm:w-80">
            <Icon name="search" size={18} />
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="หัวข้อ เนื้อหา หรือผู้ประกาศ"
              className="w-full bg-transparent text-[15px] text-ink outline-none"
            />
          </label>
        </div>

        {!isLoaded ? (
          <div className={`${card} p-12 text-center text-sm text-ink-soft`}>
            <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-brand-ink" />
            กำลังโหลดประกาศ…
          </div>
        ) : announcements.length === 0 ? (
          <div className={`${card} flex flex-col items-center gap-3 p-12 text-center`}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
              <Icon name="megaphone" size={28} />
            </span>
            <h2 className="text-lg font-bold">No announcements yet</h2>
            <p className="text-sm text-ink-soft">
              {searchQuery ? "ไม่พบประกาศที่ตรงกับคำค้นหา ลองใช้คำอื่น" : "ยังไม่มีข่าวในรอบ 1 ปีนี้"}
            </p>
            {isAdmin && !searchQuery && (
              <button type="button" onClick={handleOpenCreate} className={cardButton}>
                <Icon name="plus" size={16} strokeWidth={2.2} />
                New announcement
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {announcements.map((item) => {
              const isSent = item.status === "sent"
              const isFailed = item.status === "failed"
              const isDue = item.status === "pending" && new Date(item.scheduledAt).getTime() <= now
              const status = isSent
                ? { label: "Sent to LINE", cls: "bg-done-soft text-done", icon: "completed" as const }
                : isFailed
                  ? { label: "Failed", cls: "bg-pru-red-soft text-brand-ink", icon: "warning" as const }
                  : isDue
                    ? { label: "Sending now", cls: "bg-pru-red-soft text-brand-ink", icon: "send" as const }
                    : { label: "Scheduled", cls: "bg-surface text-ink", icon: "inProgress" as const }
              const whenIso = isSent ? item.sentAt || item.createdAt : item.scheduledAt
              const when = new Date(whenIso)
              const valid = !Number.isNaN(when.getTime())
              const sendLabel = isSent ? "Send again" : isFailed ? "Try again" : "Send now"

              return (
                <li key={item.id} className={`${card} grid grid-cols-[64px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-5 sm:p-5`}>
                  <span
                    className={`flex h-fit flex-col items-center overflow-hidden rounded-xl border text-center ${isSent ? "border-done-line" : "border-pru-red-line"}`}
                  >
                    <span className={`w-full py-0.5 text-[11px] font-bold text-white ${isSent ? "bg-done" : "bg-brand-ink"}`}>
                      {valid ? when.toLocaleDateString("en-GB", { month: "short" }).toUpperCase() : "—"}
                    </span>
                    <b className="text-2xl leading-snug">{valid ? when.getDate() : "?"}</b>
                    <span className="pb-1 text-[11px] text-ink-soft">
                      {valid ? when.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </span>

                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[17px] leading-snug font-bold">{item.title}</h2>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${status.cls}`}>
                        <Icon name={status.icon} size={14} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex min-w-0 gap-4">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block" />
                      )}
                      <p className="line-clamp-3 text-[15px] whitespace-pre-line text-ink">{item.content}</p>
                    </div>
                    {isFailed && item.sendError && (
                      <p className="rounded-xl bg-pru-red-soft px-3 py-2 text-[13px] text-ink">{item.sendError}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                      <Icon name="user" size={14} />
                      {item.author} · {formatDateTime(whenIso)}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="col-span-2 flex items-start gap-1 sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => handleBroadcast(item.id)}
                        disabled={broadcastingId === item.id}
                        className={cardButton}
                      >
                        {broadcastingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="send" size={16} />}
                        {sendLabel}
                      </button>
                      <button type="button" onClick={() => handleOpenEdit(item)} className={iconButton} aria-label="Edit announcement" title="Edit">
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirmAction({
                            title: "ลบประกาศนี้?",
                            icon: "trash",
                            message: item.title,
                            confirmLabel: "Delete",
                            tone: "danger",
                          })
                          if (ok) await handleDelete(item.id)
                        }}
                        className={`${iconButton} hover:text-brand-ink`}
                        aria-label="Delete announcement"
                        title="Delete"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </PageBody>

      {isModalOpen && (
        <AnnouncementModal
          key={itemToEdit?.id ?? "new"}
          isOpen
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          itemToEdit={itemToEdit}
        />
      )}
    </div>
  )
}
