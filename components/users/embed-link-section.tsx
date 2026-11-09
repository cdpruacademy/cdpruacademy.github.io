"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { card, cardButton, cardButtonDark } from "@/components/page-hero"
import { embedUrl } from "@/lib/embed"
import { confirmAction, toast } from "@/lib/notify"
import { getEmbedLink, newEmbedLink, stopEmbedLink } from "@/lib/supabase"

type Link = { token: string; created_at: string } | null

const made = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })

/** The link another website uses to show Timeline and Analytics without a login */
export function EmbedLinkSection() {
  const [link, setLink] = useState<Link | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    getEmbedLink()
      .then((l) => alive && setLink(l))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const url = link ? embedUrl(link.token) : ""

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("คัดลอกไม่สำเร็จ")
    }
  }

  const renew = async () => {
    if (link) {
      const ok = await confirmAction({
        title: "สร้างลิงก์ใหม่?",
        message: "ลิงก์เดิมจะใช้ไม่ได้ทันที ต้องส่งลิงก์ใหม่ให้เว็บที่ใช้อยู่",
        confirmLabel: "สร้างใหม่",
        tone: "danger",
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      setLink(await newEmbedLink())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างลิงก์ไม่สำเร็จ")
    }
    setBusy(false)
  }

  const stop = async () => {
    const ok = await confirmAction({
      title: "ปิดลิงก์?",
      message: "เว็บที่ใช้ลิงก์นี้จะไม่เห็นข้อมูลอีก",
      confirmLabel: "ปิดลิงก์",
      tone: "danger",
    })
    if (!ok) return
    setBusy(true)
    try {
      await stopEmbedLink()
      setLink(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ปิดลิงก์ไม่สำเร็จ")
    }
    setBusy(false)
  }

  return (
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <div>
        <h2 className="text-lg font-bold">ลิงก์สำหรับเว็บอื่น</h2>
        <p className="text-sm text-ink-soft">Timeline และ Analytics แบบดูอย่างเดียว ไม่ต้องล็อกอิน ใครได้ลิงก์ก็เปิดดูได้</p>
      </div>

      {failed ? (
        <p className="text-sm font-semibold text-brand-ink">อ่านลิงก์ไม่สำเร็จ</p>
      ) : link === undefined ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
      ) : (
        <>
          {link ? (
            <div className="flex flex-col gap-1 rounded-[16px] bg-paper p-3">
              <code className="block text-[13px] break-all text-ink">{url}</code>
              <span className="text-[13px] text-ink-soft">สร้างเมื่อ {made(link.created_at)}</span>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">ปิดอยู่</p>
          )}
          <div className="flex flex-wrap gap-2">
            {link && (
              <button type="button" onClick={() => void copy()} className={cardButtonDark}>
                <Icon name={copied ? "check" : "external"} size={17} />
                {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
              </button>
            )}
            <button type="button" onClick={() => void renew()} disabled={busy} className={link ? cardButton : cardButtonDark}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="refresh" size={17} />}
              {link ? "สร้างลิงก์ใหม่" : "เปิดลิงก์"}
            </button>
            {link && (
              <button type="button" onClick={() => void stop()} disabled={busy} className={cardButton}>
                <Icon name="lock" size={17} />
                ปิดลิงก์
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
