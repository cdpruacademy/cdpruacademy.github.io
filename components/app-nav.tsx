"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { ROLE_LABEL } from "@/lib/access"
import { Icon, IconName } from "./icon"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

interface NavItem {
  href: string
  label: string
  /** Shorter label for the phone menu */
  shortLabel?: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Timeline", icon: "timeline" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
  { href: "/announcements", label: "Announcements", shortLabel: "Announce", icon: "megaphone" },
  { href: "/partners", label: "Partners", icon: "partner" },
  { href: "/kpi", label: "KPI", icon: "donut" },
  { href: "/users", label: "Users", icon: "team" },
]

export function AppNav() {
  const pathname = usePathname()
  const { role, canView, logout } = useAdminAuth()
  // Signed out: only the logo, with the login page under it
  const items = role ? NAV_ITEMS.filter((i) => canView(i.href)) : []

  const renderItem = (item: NavItem, variant: "top" | "bottom") => {
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
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
      </>
    )

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
            {role && (
              <>
                <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-semibold">
                  <Icon name="lock" size={14} />
                  {ROLE_LABEL[role]}
                </span>
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
            )}
          </div>
        </div>
      </header>

      {/* Phones and tablets: the main menu sits at the bottom, within thumb reach */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ display: items.length ? undefined : "none", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => renderItem(item, "bottom"))}
      </nav>
    </>
  )
}
