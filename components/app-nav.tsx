"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { ROLE_LABEL } from "@/lib/access"
import { AdminLoginModal } from "./auth/admin-login-modal"
import { ChangePasswordDialog } from "./auth/change-password-dialog"
import { Icon, IconName } from "./icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface NavItem {
  href: string
  label: string
  /** Shorter label for the phone menu */
  shortLabel?: string
  icon: IconName
  adminOnly?: boolean
  /** Hidden from people who are signed out, instead of locked */
  hiddenForViewers?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Timeline", icon: "timeline" },
  { href: "/analytics", label: "Analytics", icon: "chart", adminOnly: true },
  { href: "/announcements", label: "Announcements", shortLabel: "Announce", icon: "megaphone" },
  {
    href: "/partners",
    label: "Partners",
    icon: "partner",
    adminOnly: true,
    hiddenForViewers: true,
  },
  { href: "/kpi", label: "KPI", icon: "donut", adminOnly: true, hiddenForViewers: true },
  { href: "/users", label: "Users", icon: "team", adminOnly: true, hiddenForViewers: true },
]

export function AppNav() {
  const pathname = usePathname()
  const { role, canView, login, logout } = useAdminAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const items = NAV_ITEMS.filter((i) => (role ? canView(i.href) : !i.hiddenForViewers))

  // Locked items open the login dialog for people who are signed out
  const renderItem = (item: NavItem, variant: "top" | "bottom") => {
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    const locked = item.adminOnly && !role
    const top =
      "touch-target inline-flex h-[64px] items-center gap-2 px-2.5 text-[15px] lg:px-4 whitespace-nowrap transition-colors md:h-[72px] " +
      (isActive
        ? "font-bold text-ink shadow-[inset_0_-3px_0_var(--color-pru-red)]"
        : "text-ink-soft hover:text-ink")
    const bottom =
      "flex min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] " +
      (isActive ? "font-bold text-brand-ink" : "text-ink-soft")
    const label = variant === "bottom" ? item.shortLabel ?? item.label : item.label
    const content = (
      <>
        {/* On smaller desktops the labels alone fit beside the role button */}
        <span className={variant === "top" ? "hidden xl:inline-flex" : "inline-flex"}>
          <Icon name={item.icon} size={variant === "top" ? 18 : 22} />
        </span>
        {/* Sized for the bold label, so picking a page does not move the items after it */}
        <span className="inline-grid">
          <span className="col-start-1 row-start-1">{label}</span>
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-bold">
            {label}
          </span>
        </span>
        {locked && variant === "top" && <Icon name="lock" size={14} label="ต้องเข้าสู่ระบบ" />}
      </>
    )

    if (locked) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          className={variant === "top" ? top : bottom}
          title="เข้าสู่ระบบเพื่อดูหน้านี้"
        >
          {content}
        </button>
      )
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={variant === "top" ? top : bottom}
      >
        {content}
      </Link>
    )
  }

  return (
    <>
      <header className="border-b border-rule bg-white text-ink">
        <div className="mx-auto flex h-[64px] max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-8 md:h-[72px]">
          <div className="flex min-w-0 items-center gap-6">
            <span className="inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}/prudential-logo-th.png`}
                alt="พรูเด็นเชียล ประกันชีวิต"
                className="h-[26px] w-auto md:h-[30px]"
              />
            </span>
            <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 lg:flex">
              {items.map((item) => renderItem(item, "top"))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {role ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(true)}
                  title="เปลี่ยนรหัสผ่าน"
                  className="touch-target inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold hover:bg-rule"
                >
                  <Icon name="lock" size={14} />
                  {ROLE_LABEL[role]}
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                  className="inline-flex h-10 w-10 touch-target items-center justify-center rounded-full border border-rule text-ink hover:bg-surface"
                >
                  <Icon name="logout" size={18} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex h-10 touch-target items-center gap-2 rounded-full border border-rule px-4 text-sm font-semibold text-ink hover:bg-surface"
              >
                <Icon name="lock" size={16} />
                <span>Log in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phones and tablets: the main menu sits at the bottom, within thumb reach */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => renderItem(item, "bottom"))}
      </nav>

      {isPasswordOpen && <ChangePasswordDialog onClose={() => setIsPasswordOpen(false)} />}

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {}}
        loginFn={login}
      />
    </>
  )
}
