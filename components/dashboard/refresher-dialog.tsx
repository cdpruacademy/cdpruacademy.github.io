"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { cardButton, cardButtonDark } from "@/components/page-hero"
import { KpiDialog } from "@/components/kpi/kpi-dialog"
import { RefresherEditor } from "@/components/kpi/refresher-editor"
import { Refresher, fetchRefreshers, saveRefreshers } from "@/lib/difficulty"
import { toast } from "@/lib/notify"

/**
 * Superadmins and editors enter Refresher lessons from the Timeline page. They are saved in
 * their own row, so they never reach the Timeline table, the LINE images or the bot.
 */
export function RefresherDialog({
  year,
  teamMembers,
  onClose,
}: {
  year: number
  teamMembers: string[]
  onClose: () => void
}) {
  const [saved, setSaved] = useState<Refresher[] | null>(null)
  const [draft, setDraft] = useState<Refresher[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetchRefreshers().then((list) => {
      if (!alive) return
      setSaved(list)
      setFailed(list === null)
    })
    return () => {
      alive = false
    }
  }, [])

  const save = async () => {
    if (!draft) return onClose()
    setIsSaving(true)
    const res = await saveRefreshers(draft)
    setIsSaving(false)
    if (res.success) {
      toast.success("บันทึกแล้ว")
      onClose()
    } else {
      toast.error(res.error || "บันทึกไม่สำเร็จ")
    }
  }

  return (
    <KpiDialog
      icon="training"
      title={`Refresher · ${year}`}
      subtitle="นับใน Analytics และ KPI ไม่แสดงใน Timeline"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cardButton}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={isSaving || !draft} className={cardButtonDark}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={17} strokeWidth={2.4} />}
            Save
          </button>
        </>
      }
    >
      {saved ? (
        <RefresherEditor
          year={year}
          refreshers={draft ?? saved}
          teamMembers={teamMembers}
          onChange={setDraft}
        />
      ) : failed ? (
        <p role="alert" className="px-7 py-10 text-center text-sm font-semibold text-brand-ink">
          อ่านข้อมูลไม่สำเร็จ กรุณาปิดแล้วลองใหม่
        </p>
      ) : (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
      )}
    </KpiDialog>
  )
}
