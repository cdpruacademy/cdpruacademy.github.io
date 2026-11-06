"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Icon } from "@/components/icon"
import { PageBody, PageHero, card, cardButtonDark } from "@/components/page-hero"
import { ChangeLogSection } from "@/components/users/change-log-section"
import { PickMenu } from "@/components/ui/pick-menu"
import { DEFAULT_TAB_ACCESS, OPTIONAL_TABS, ROLE_LABEL, Role, TabAccess, shortLogin, toLoginEmail } from "@/lib/access"
import {
  ManagedUser,
  fetchTabAccess,
  getCurrentEmail,
  listUsers,
  removeUserRole,
  saveTabAccess,
  setUserRole,
} from "@/lib/supabase"
import { toast } from "@/lib/notify"

const ACCOUNTS_URL = "https://supabase.com/dashboard/project/bwevlsmrtbqbgsqjpppn/auth/users"

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))
const pickButton =
  "inline-flex h-10 min-w-[136px] items-center justify-between gap-2 rounded-full border-[1.5px] border-rule bg-white px-3.5 text-sm font-semibold text-ink"

const signedInLabel = (u: ManagedUser) => {
  if (!u.has_account) return "ยังไม่มีบัญชี"
  if (!u.last_sign_in_at) return "ยังไม่เคยเข้าใช้"
  return `เข้าใช้ล่าสุด ${new Date(u.last_sign_in_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}`
}

/** Superadmins choose who has which role, and which tabs each role sees */
export function UsersView() {
  const { isSuperadmin } = useAdminAuth()
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [tabs, setTabs] = useState<TabAccess>(DEFAULT_TAB_ACCESS)
  const [me, setMe] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("editor")
  const [isAdding, setIsAdding] = useState(false)

  const reload = useCallback(async () => {
    const list = await listUsers()
    if (list) setUsers(list)
    else toast.error("อ่านรายชื่อไม่สำเร็จ")
  }, [])

  useEffect(() => {
    if (!isSuperadmin) return
    let alive = true
    Promise.all([listUsers(), fetchTabAccess(), getCurrentEmail()]).then(([list, access, mine]) => {
      if (!alive) return
      setUsers(list ?? [])
      if (!list) toast.error("อ่านรายชื่อไม่สำเร็จ")
      if (access) setTabs(access)
      setMe(mine)
    })
    return () => {
      alive = false
    }
  }, [isSuperadmin])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    const clean = toLoginEmail(email)
    if (users?.some((u) => u.email === clean)) return toast.error("มีชื่อนี้แล้ว")
    setIsAdding(true)
    const res = await setUserRole(clean, role)
    setIsAdding(false)
    if (res.success) {
      setEmail("")
      await reload()
    } else {
      toast.error(res.error || "เพิ่มไม่สำเร็จ")
    }
  }

  const changeRole = async (target: string, next: Role) => {
    const res = await setUserRole(target, next)
    if (!res.success) toast.error(res.error || "เปลี่ยน role ไม่สำเร็จ")
    await reload()
  }

  const remove = async (target: string) => {
    if (!window.confirm(`เอา ${shortLogin(target)} ออก?`)) return
    const res = await removeUserRole(target)
    if (!res.success) toast.error(res.error || "เอาออกไม่สำเร็จ")
    await reload()
  }

  const toggleTab = async (who: keyof TabAccess, href: string) => {
    const before = tabs
    const list = tabs[who]
    const next = { ...tabs, [who]: list.includes(href) ? list.filter((h) => h !== href) : [...list, href] }
    setTabs(next)
    const res = await saveTabAccess(next)
    if (!res.success) {
      setTabs(before)
      toast.error(res.error || "บันทึกไม่สำเร็จ")
    }
  }

  const hero = (
    <PageHero>
      <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">Users</h1>
    </PageHero>
  )

  return (
    <div>
      {hero}
      <PageBody className="flex flex-col gap-5">
        <section className={`${card} flex flex-col gap-4 p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">ผู้ใช้</h2>
            <a
              href={ACCOUNTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline"
            >
              สร้างบัญชีใน Supabase
              <Icon name="external" size={15} />
            </a>
          </div>

          <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-[16px] bg-paper p-3">
            <input
              type="text"
              required
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ชื่อผู้ใช้"
              aria-label="ชื่อผู้ใช้"
              className="h-10 min-w-[200px] flex-1 rounded-full border-[1.5px] border-rule bg-white px-4 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-ink focus:outline-none"
            />
            <PickMenu
              label="Role"
              value={role}
              onChange={(v) => setRole(v as Role)}
              options={ROLE_OPTIONS}
              className={pickButton}
            />
            <button type="submit" disabled={isAdding} className={cardButtonDark}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon name="plus" size={17} />}
              Add
            </button>
          </form>

          {users === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
          ) : (
            <ul className="divide-y divide-surface">
              {users.map((u) => {
                const isMe = u.email === me
                return (
                  <li key={u.email} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-[1_1_240px]">
                      <b className="block truncate text-[15px] font-semibold text-ink">
                        {shortLogin(u.email)}
                        {isMe && <span className="ml-2 text-[13px] font-semibold text-ink-soft">คุณ</span>}
                      </b>
                      <span className={`text-[13px] ${u.has_account ? "text-ink-soft" : "font-semibold text-brand-ink"}`}>
                        {signedInLabel(u)}
                      </span>
                    </div>
                    {isMe ? (
                      <span className="text-sm font-semibold">{ROLE_LABEL[u.role]}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <PickMenu
                          label={`Role ของ ${shortLogin(u.email)}`}
                          value={u.role}
                          onChange={(v) => void changeRole(u.email, v as Role)}
                          options={ROLE_OPTIONS}
                          className={pickButton}
                          align="end"
                        />
                        <button
                          type="button"
                          onClick={() => void remove(u.email)}
                          aria-label={`เอา ${shortLogin(u.email)} ออก`}
                          className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-brand-ink"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={`${card} flex flex-col gap-3 p-5`}>
          <h2 className="text-lg font-bold">เปิดปิด Tab</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[3px] border-ink text-left text-ink-soft">
                <th className="py-2 font-semibold">Tab</th>
                <th className="w-24 py-2 text-center font-semibold">Editor</th>
                <th className="w-24 py-2 text-center font-semibold">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {OPTIONAL_TABS.map((tab) => (
                <tr key={tab.href}>
                  <td className="py-3 font-semibold">{tab.label}</td>
                  {(["editor", "viewer"] as const).map((who) => (
                    <td key={who} className="py-3 text-center">
                      {tab.roles.includes(who) ? (
                        <input
                          type="checkbox"
                          checked={tabs[who].includes(tab.href)}
                          onChange={() => void toggleTab(who, tab.href)}
                          aria-label={`${tab.label} สำหรับ ${who}`}
                          className="h-5 w-5 accent-[var(--color-pru-red)]"
                        />
                      ) : (
                        <span className="text-ink-soft">–</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <ChangeLogSection />
      </PageBody>
    </div>
  )
}
