"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { AdminLoginModal } from "./auth/admin-login-modal"
import { Icon, IconName } from "./icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface NavItem {
  href: string
  label: string
  icon: IconName
  adminOnly?: boolean
  /** Hidden from viewers instead of locked */
  hiddenForViewers?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Timeline", icon: "timeline" },
  { href: "/analytics", label: "Analytics", icon: "chart", adminOnly: true },
  { href: "/announcements", label: "Announcements", icon: "megaphone" },
  {
    href: "/partners",
    label: "Partners",
    icon: "partner",
    adminOnly: true,
    hiddenForViewers: true,
  },
]

export function AppNav() {
  const pathname = usePathname()
  const { isAdmin, login, logout } = useAdminAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const items = NAV_ITEMS.filter((i) => isAdmin || !i.hiddenForViewers)

  // Admin-only items open the login dialog for viewers
  const renderItem = (item: NavItem, variant: "top" | "bottom") => {
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    const locked = item.adminOnly && !isAdmin
    const top =
      "touch-target inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-colors " +
      (isActive ? "bg-white/20 font-bold text-white" : "text-white hover:bg-white/10")
    const bottom =
      "flex flex-col items-center justify-center gap-0.5 text-xs " +
      (isActive ? "font-bold text-brand-ink" : "text-ink-soft")
    const content = (
      <>
        <Icon name={item.icon} size={variant === "top" ? 18 : 22} />
        <span>{item.label}</span>
        {locked && variant === "top" && <Icon name="lock" size={14} label="เฉพาะ Admin" />}
      </>
    )

    if (locked) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          className={variant === "top" ? top : bottom}
          title="เข้าสู่ระบบ Admin เพื่อดูหน้านี้"
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
      <header className="bg-pru-red text-white">
        <div className="mx-auto flex h-[64px] max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-8 md:h-[72px]">
          <div className="flex min-w-0 items-center gap-6">
            <span className="inline-flex rounded-xl bg-white px-2.5 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}/prudential-logo-th.png`}
                alt="พรูเด็นเชียล ประกันชีวิต"
                className="h-[22px] w-auto md:h-[26px]"
              />
            </span>
            <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 md:flex">
              {items.map((item) => renderItem(item, "top"))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[13px] font-semibold sm:inline-flex">
                  <Icon name="lock" size={14} />
                  Admin
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="ออกจากโหมด Admin"
                  title="ออกจากโหมด Admin"
                  className="inline-flex h-10 w-10 touch-target items-center justify-center rounded-full border-[1.5px] border-white/55 text-white hover:bg-white/15"
                >
                  <Icon name="logout" size={18} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex h-10 touch-target items-center gap-2 rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold text-white hover:bg-white/15"
              >
                <Icon name="lock" size={16} />
                <span>Admin login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phones: the main menu sits at the bottom, within thumb reach */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => renderItem(item, "bottom"))}
      </nav>

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {}}
        loginFn={login}
      />
    </>
  )
}
