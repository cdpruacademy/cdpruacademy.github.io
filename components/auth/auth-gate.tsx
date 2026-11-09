"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { LoginPanel } from "@/components/auth/login-panel"
import { card, cardButton } from "@/components/page-hero"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { tabOfPath } from "@/lib/access"
import { clearLocalData } from "@/lib/supabase"
import { isEmbedPath } from "@/lib/embed"

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">{children}</div>
}

/** Pages only load, and read data, for someone signed in with a role who may see that tab */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The embed page has its own check: the database reads its link code
  if (isEmbedPath(pathname)) return <>{children}</>
  return <SignedInGate pathname={pathname}>{children}</SignedInGate>
}

function SignedInGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { role, isAuthLoaded, authFailed, canView, login } = useAdminAuth()
  const signedOut = isAuthLoaded && !role && !authFailed

  // Nothing from an earlier session stays in this browser
  useEffect(() => {
    if (signedOut) clearLocalData()
  }, [signedOut])

  if (!isAuthLoaded) {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="กำลังโหลด" />
      </Centered>
    )
  }

  if (!role && authFailed) {
    return (
      <Centered>
        <div className={`${card} flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
          <Icon name="warning" size={28} className="text-brand-ink" />
          <h2 className="text-lg font-bold">เชื่อมต่อไม่สำเร็จ</h2>
          <button type="button" onClick={() => window.location.reload()} className={cardButton}>
            ลองใหม่
          </button>
        </div>
      </Centered>
    )
  }

  if (!role) {
    return (
      <Centered>
        <div className="w-full max-w-[400px] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)]">
          <LoginPanel loginFn={login} />
        </div>
      </Centered>
    )
  }

  if (!canView(tabOfPath(pathname))) {
    return (
      <Centered>
        <div className={`${card} flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
            <Icon name="lock" size={28} />
          </span>
          <h2 className="text-lg font-bold">ไม่มีสิทธิ์ดูหน้านี้</h2>
          <Link href="/" className={cardButton}>
            Back to Timeline
          </Link>
        </div>
      </Centered>
    )
  }

  return <>{children}</>
}
