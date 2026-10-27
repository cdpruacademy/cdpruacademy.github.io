"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { AdminLoginModal } from "./auth/admin-login-modal"
import { PruIcon, PruIconName } from "./pru-icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface NavItem {
  href: string
  label: string
  icon: PruIconName
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Timeline", icon: "calendar" },
  { href: "/announcements", label: "ประชาสัมพันธ์", icon: "megaphone" },
  { href: "/analytics", label: "สรุปสถิติ", icon: "chart", adminOnly: true },
]

export function AppNav() {
  const pathname = usePathname()
  const { isAdmin, login, logout } = useAdminAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // Analytics is admin-only: for viewers the item opens the login dialog instead
  const renderItem = (item: NavItem, variant: "top" | "bottom") => {
    const isActive = pathname === item.href
    const locked = item.adminOnly && !isAdmin
    const top =
      "touch-target inline-flex items-center gap-2 px-4 text-[15px] whitespace-nowrap border-b-4 transition-colors " +
      (isActive
        ? "border-pru-red font-bold text-ink"
        : "border-transparent text-ink-soft hover:text-ink")
    const bottom =
      "flex flex-col items-center justify-center gap-0.5 text-xs border-t-4 -mt-[2px] " +
      (isActive
        ? "border-pru-red font-bold text-ink"
        : "border-transparent text-ink-soft")
    const content = (
      <>
        <PruIcon
          name={item.icon}
          size={variant === "top" ? 20 : 22}
          className={isActive && variant === "bottom" ? "text-pru-red" : ""}
        />
        <span>{item.label}</span>
        {locked && variant === "top" && (
          <PruIcon name="lock" size={14} label="เฉพาะ Admin" />
        )}
      </>
    )

    if (locked) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          className={variant === "top" ? top : bottom}
          title="เข้าสู่ระบบ Admin เพื่อดูสรุปสถิติ"
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
      <header className="sticky top-0 z-40 border-b-2 border-rule bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-stretch justify-between gap-4 px-4 sm:px-6 md:h-[72px] lg:px-10">
          <div className="flex min-w-0 items-center gap-4 lg:gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BASE_PATH}/prudential-logo-th.png`}
              alt="พรูเด็นเชียล ประกันชีวิต"
              className="h-[26px] w-auto md:h-[34px]"
            />
            <span
              aria-hidden="true"
              className="hidden h-7 w-[2px] bg-rule lg:block"
            />
            <span className="hidden text-sm whitespace-nowrap text-ink-soft lg:block">
              ฝ่ายพัฒนาหลักสูตร
            </span>
          </div>

          <nav
            aria-label="เมนูหลัก"
            className="hidden items-stretch gap-1 md:flex"
          >
            {NAV_ITEMS.map((item) => renderItem(item, "top"))}
          </nav>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <span className="hidden border-2 border-rule px-3 py-1 text-[13px] font-bold sm:inline-flex">
                  Admin
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="ออกจากโหมด Admin"
                  title="ออกจากโหมด Admin"
                  className="inline-flex h-11 touch-target w-11 items-center justify-center border-2 border-rule bg-white text-ink-soft hover:text-ink"
                >
                  <PruIcon name="logout" size={20} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex h-11 touch-target items-center gap-2 border-2 border-rule bg-white px-4 text-sm font-bold text-ink hover:border-ink"
              >
                <PruIcon name="lock" size={18} />
                <span>เข้าสู่ระบบ Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phones: the main menu sits at the bottom, within thumb reach */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t-2 border-rule bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map((item) => renderItem(item, "bottom"))}
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
