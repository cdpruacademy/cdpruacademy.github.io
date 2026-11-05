"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { tabOfPath } from "@/lib/access"

/** Stops a direct link to a tab that is turned off for this person's role */
export function TabGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, canView } = useAdminAuth()

  if (!role || canView(tabOfPath(pathname))) return <>{children}</>

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className={`${card} flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
          <Icon name="lock" size={28} />
        </span>
        <h2 className="text-lg font-bold">ไม่มีสิทธิ์ดูหน้านี้</h2>
        <Link href="/" className={cardButton}>
          Back to Timeline
        </Link>
      </div>
    </div>
  )
}
