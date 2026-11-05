"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { KpiDialog } from "@/components/kpi/kpi-dialog"
import { cardButton, cardButtonDark } from "@/components/page-hero"
import { changeMyPassword } from "@/lib/supabase"
import { toast } from "@/lib/notify"

const MIN_LENGTH = 10

const input =
  "h-[46px] w-full rounded-[14px] border-[1.5px] border-rule bg-white px-3.5 text-[15px] text-ink focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
const label = "flex flex-col gap-1.5 text-[13px] font-bold text-stone-700"

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    if (next.length < MIN_LENGTH) return setError(`รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_LENGTH} ตัวอักษร`)
    if (next !== again) return setError("รหัสผ่านใหม่ไม่ตรงกัน")
    setIsSaving(true)
    const res = await changeMyPassword(current, next)
    setIsSaving(false)
    if (res.success) {
      toast.success("เปลี่ยนรหัสผ่านแล้ว")
      onClose()
    } else {
      setError(res.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ")
    }
  }

  return (
    <KpiDialog
      icon="lock"
      title="เปลี่ยนรหัสผ่าน"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cardButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !current || !next || !again}
            className={cardButtonDark}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={17} strokeWidth={2.4} />}
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-7">
        <label className={label}>
          รหัสผ่านปัจจุบัน
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value)
              setError(null)
            }}
            className={input}
          />
        </label>
        <label className={label}>
          รหัสผ่านใหม่
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value)
              setError(null)
            }}
            className={input}
          />
        </label>
        <label className={label}>
          ยืนยันรหัสผ่านใหม่
          <input
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => {
              setAgain(e.target.value)
              setError(null)
            }}
            className={input}
          />
        </label>
        {error && (
          <span role="alert" className="inline-flex items-center gap-1.5 text-[13px] text-brand-ink">
            <Icon name="warning" size={15} strokeWidth={2} />
            {error}
          </span>
        )}
      </div>
    </KpiDialog>
  )
}
