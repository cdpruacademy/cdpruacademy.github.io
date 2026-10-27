"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { usePartners } from "@/hooks/use-partners"
import { useProducts } from "@/hooks/use-products"
import { AdminLoginModal } from "@/components/auth/admin-login-modal"
import { Icon } from "@/components/icon"
import {
  PageBody,
  PageHero,
  card,
  cardButton,
  cardButtonDark,
  heroButtonSolid,
} from "@/components/page-hero"
import {
  Partner,
  isHexColor,
  isNearColor,
  partnerOf,
  textOn,
  unassignedChannels,
} from "@/lib/partners"
import { confirmAction, toast } from "@/lib/notify"

const PRESETS = ["#00A651", "#4E2A84", "#FFD400", "#F28C28", "#0F766E", "#1E40AF", "#BE185D", "#57534E"]

const input =
  "h-10 w-full rounded-xl border-[1.5px] border-rule bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"

const slug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  `partner-${Date.now()}`

/** Admin page: partners, their brand colours and the channels under each */
export function PartnersView() {
  const { isAdmin, login } = useAdminAuth()
  const { partners, savePartners } = usePartners()
  const { monthlyStore } = useProducts()
  const [draft, setDraft] = useState<Partner[] | null>(null)
  const [channelDrafts, setChannelDrafts] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: "", color: PRESETS[0], channel: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const list = draft ?? partners
  const isDirty = draft !== null

  // Channels used by saved projects, and how many projects each partner has
  const { usedChannels, counts } = useMemo(() => {
    const used: string[] = []
    const seen = new Set<string>()
    Object.values(monthlyStore || {}).forEach((m) => {
      ;[...(m.products || []), ...(m.enhancements || [])].forEach((p) => {
        if (!p.broker) return
        used.push(p.broker)
        const key = `${p.name.trim().toLowerCase()}__${p.broker.trim().toLowerCase()}`
        seen.add(key)
      })
    })
    const projectKeys = Array.from(seen)
    const c: Record<string, number> = {}
    projectKeys.forEach((key) => {
      const broker = key.split("__")[1]
      const id = partnerOf(broker, list).id
      c[id] = (c[id] || 0) + 1
    })
    return { usedChannels: used, counts: c }
  }, [monthlyStore, list])
  const orphans = unassignedChannels(usedChannels, list)

  const update = (next: Partner[]) => setDraft(next)
  const patch = (id: string, change: Partial<Partner>) =>
    update(list.map((p) => (p.id === id ? { ...p, ...change } : p)))

  const addChannel = (p: Partner, name: string) => {
    const v = name.trim()
    if (!v) return
    if (list.some((x) => x.channels.some((c) => c.toLowerCase() === v.toLowerCase()))) {
      toast.error(`มี Channel "${v}" อยู่แล้ว`)
      return
    }
    patch(p.id, { channels: [...p.channels, v] })
    setChannelDrafts((d) => ({ ...d, [p.id]: "" }))
  }

  const removePartner = async (p: Partner) => {
    const ok = await confirmAction({
      title: `Remove ${p.name}?`,
      message:
        (counts[p.id] || 0) > 0
          ? `มี ${counts[p.id]} projects ใช้ Partner นี้อยู่ projects เหล่านั้นจะไปอยู่ในกลุ่ม Other จนกว่าจะย้าย Channel ไป Partner อื่น`
          : "Partner นี้ยังไม่มี project",
      confirmLabel: "Remove",
      tone: "danger",
    })
    if (ok) update(list.filter((x) => x.id !== p.id))
  }

  const addPartner = () => {
    const name = form.name.trim()
    if (!name || !isHexColor(form.color)) return
    if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`มี Partner "${name}" อยู่แล้ว`)
      return
    }
    let id = slug(name)
    while (list.some((p) => p.id === id)) id = `${id}-2`
    update([...list, { id, name, color: form.color.toUpperCase(), channels: form.channel.trim() ? [form.channel.trim()] : [] }])
    setForm({ name: "", color: PRESETS[0], channel: "" })
  }

  const save = async () => {
    if (!draft) return
    setIsSaving(true)
    const res = await savePartners(draft)
    setIsSaving(false)
    if (res.success) {
      setDraft(null)
      toast.success("บันทึก Partners แล้ว ทุกหน้าจะใช้สีใหม่")
    } else {
      toast.error("บันทึกไม่สำเร็จ: " + (res.error || ""))
    }
  }

  const totalChannels = list.reduce((s, p) => s + p.channels.length, 0)
  const clash = list.some((p) => isNearColor(p.color, form.color))

  return (
    <div>
      <PageHero>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">Partners &amp; Channels</h1>
            <p className="mt-2 max-w-[62ch] text-base">
              สีมาจาก Partner และใช้กับทุก Channel ข้างใต้ มี Partner ใหม่ก็เพิ่มที่นี่ได้เลย ไม่ต้องแก้โค้ด
            </p>
          </div>
          <div className="flex items-end gap-7">
            <div>
              <div className="text-sm">Partners</div>
              <div className="text-[44px] leading-none font-bold">{list.length}</div>
            </div>
            <div>
              <div className="text-sm">Channels</div>
              <div className="text-[44px] leading-none font-bold">{totalChannels}</div>
            </div>
            {isAdmin && (
              <button type="button" onClick={save} disabled={!isDirty || isSaving} className={heroButtonSolid}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="check" size={18} strokeWidth={2.4} />}
                {isDirty ? "Save changes" : "Saved"}
              </button>
            )}
          </div>
        </div>
      </PageHero>

      <PageBody className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-4">
          {!isAdmin && (
            <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
              <span className="inline-flex items-center gap-2.5 text-sm">
                <Icon name="lock" size={18} />
                ดูได้อย่างเดียว เข้าสู่ระบบ Admin เพื่อแก้ไข
              </span>
              <button type="button" onClick={() => setIsLoginOpen(true)} className={cardButtonDark}>
                Admin login
              </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {list.map((p) => {
              const fg = textOn(p.color)
              return (
                <section key={p.id} className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between gap-3 px-4 py-4" style={{ background: p.color, color: fg }}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <Icon name="partner" size={24} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        {isAdmin ? (
                          <input
                            aria-label="Partner name"
                            value={p.name}
                            onChange={(e) => patch(p.id, { name: e.target.value })}
                            className="w-full rounded-md bg-transparent text-lg font-bold outline-none focus:bg-white/15"
                          />
                        ) : (
                          <b className="text-lg">{p.name}</b>
                        )}
                        <span className="text-xs opacity-85">{p.color}</span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[30px] leading-none font-bold">{counts[p.id] || 0}</span>
                      <span className="text-xs opacity-85">projects</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-[13px] font-semibold">
                        Colour
                        <input
                          type="color"
                          value={isHexColor(p.color) ? p.color : "#000000"}
                          onChange={(e) => patch(p.id, { color: e.target.value.toUpperCase() })}
                          className="h-8 w-10 cursor-pointer rounded-md border border-rule"
                        />
                        <input
                          aria-label={`${p.name} colour code`}
                          value={p.color}
                          onChange={(e) => patch(p.id, { color: e.target.value })}
                          className={`${input} h-8 max-w-[110px]`}
                        />
                      </label>
                    )}
                    <span className="text-[13px] font-semibold">Channels</span>
                    <div className="flex min-h-[34px] flex-wrap gap-1.5">
                      {p.channels.length === 0 && <span className="self-center text-[13px] text-ink-soft">ยังไม่มี Channel</span>}
                      {p.channels.map((c) => (
                        <span key={c} className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-surface pr-1 pl-3 text-[13px] font-semibold">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                          {c}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => patch(p.id, { channels: p.channels.filter((x) => x !== c) })}
                              aria-label={`Remove ${c}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-rule hover:text-ink"
                            >
                              <Icon name="close" size={14} strokeWidth={2} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <input
                          aria-label={`Add channel to ${p.name}`}
                          placeholder="เพิ่ม Channel เช่น Branch, Digital"
                          value={channelDrafts[p.id] || ""}
                          onChange={(e) => setChannelDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addChannel(p, channelDrafts[p.id] || "")}
                          className={input}
                        />
                        <button type="button" onClick={() => addChannel(p, channelDrafts[p.id] || "")} className={cardButton}>
                          <Icon name="plus" size={16} strokeWidth={2.2} />
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => removePartner(p)}
                          aria-label={`Remove partner ${p.name}`}
                          title="Remove partner"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule text-ink-soft hover:text-brand-ink"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>

          {orphans.length > 0 && (
            <section className={`${card} flex flex-col gap-3 border-[1.5px] border-amber-200 px-5 py-4`}>
              <span className="flex items-start gap-2.5 text-sm">
                <Icon name="warning" size={20} className="shrink-0 text-brand-ink" />
                Channel ในข้อมูลเดิมที่ยังไม่อยู่ใต้ Partner ไหน (ตอนนี้แสดงในกลุ่ม Other)
              </span>
              <div className="flex flex-wrap gap-2">
                {orphans.map((o) => (
                  <span key={o} className="inline-flex items-center gap-2 rounded-full bg-surface py-1 pr-1 pl-3 text-[13px] font-semibold">
                    {o}
                    {isAdmin && (
                      <select
                        aria-label={`Move ${o} to a partner`}
                        value=""
                        onChange={(e) => {
                          const target = list.find((p) => p.id === e.target.value)
                          if (target) patch(target.id, { channels: [...target.channels, o] })
                        }}
                        className="h-8 rounded-full border border-rule bg-white px-2 text-xs"
                      >
                        <option value="">Move to…</option>
                        {list.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {isAdmin && (
          <section className={`${card} flex flex-col gap-4 p-5 lg:sticky lg:top-4`}>
            <h2 className="flex items-center gap-2.5 text-lg font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-pru-red-soft text-brand-ink">
                <Icon name="plus" size={18} strokeWidth={2.2} />
              </span>
              Add partner
            </h2>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Partner name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น Krungsri" className={input} />
            </label>
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
              <label htmlFor="new-partner-color">Brand colour</label>
              <span className="flex gap-2">
                <input
                  type="color"
                  aria-label="Pick brand colour"
                  value={isHexColor(form.color) ? form.color : "#000000"}
                  onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-rule"
                />
                <input id="new-partner-color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#RRGGBB" className={input} />
              </span>
              <span className="flex flex-wrap gap-1.5">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`Use ${c}`}
                    title={c}
                    className={`h-7 w-7 rounded-lg ${form.color === c ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </span>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              <span>
                First channel <span className="font-normal text-ink-soft">(ไม่ใส่ก็ได้)</span>
              </span>
              <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="เช่น Branch" className={input} />
            </label>
            <div className="overflow-hidden rounded-2xl border-[1.5px] border-rule">
              <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: isHexColor(form.color) ? form.color : "#A8A29E", color: textOn(form.color) }}>
                <Icon name="partner" size={20} />
                <b>{form.name || "New partner"}</b>
              </div>
              <div className="px-3.5 py-2.5 text-xs text-ink-soft">ตัวอย่างสีบน Timeline และ Analytics</div>
            </div>
            {clash && <span className="text-xs text-brand-ink">สีนี้ใกล้กับ Partner ที่มีอยู่ ลองเลือกสีที่ต่างกว่านี้</span>}
            <button type="button" onClick={addPartner} disabled={!form.name.trim() || !isHexColor(form.color)} className={`${cardButtonDark} justify-center`}>
              <Icon name="plus" size={18} strokeWidth={2.2} />
              Add partner
            </button>
            <p className="text-xs text-ink-soft">
              กด Save changes ด้านบนเพื่อบันทึก สีตั้งต้นมาจากโลโก้จริงของแต่ละ Partner (ค่าประมาณ) แก้ได้ทุกเมื่อ
            </p>
          </section>
        )}
      </PageBody>

      <AdminLoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSuccess={() => setIsLoginOpen(false)} loginFn={login} />
    </div>
  )
}
