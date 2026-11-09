"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/icon"
import { card, cardButton } from "@/components/page-hero"
import { ProductTimeline } from "@/components/dashboard/product-timeline"
import { AnalyticsView } from "@/components/analytics/analytics-view"
import { clearLocalData, fetchEmbedRows } from "@/lib/supabase"

type Page = "timeline" | "analytics"
type Check = "checking" | "ok" | "closed" | "failed"

const PAGES: { value: Page; label: string; icon: "timeline" | "chart" }[] = [
  { value: "timeline", label: "Timeline", icon: "timeline" },
  { value: "analytics", label: "Analytics", icon: "chart" },
]

const pageFromHash = (): Page => (typeof window !== "undefined" && window.location.hash === "#analytics" ? "analytics" : "timeline")

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">{children}</div>
}

/**
 * Timeline and Analytics, read only, for another website. The database checks the link's code on every read,
 * so a link that was replaced or turned off stops showing data within a minute.
 */
export function EmbedView() {
  const [check, setCheck] = useState<Check>("checking")
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    let alive = true
    // Start from nothing kept in this browser, and keep nothing after the page closes
    clearLocalData()
    const verify = (first: boolean) =>
      fetchEmbedRows()
        .then((rows) => {
          if (alive) setCheck(rows ? "ok" : "closed")
        })
        .catch(() => {
          if (alive && first) setCheck("failed")
        })
    verify(true)
    const timer = window.setInterval(() => verify(false), 60_000)
    window.addEventListener("pagehide", clearLocalData)
    return () => {
      alive = false
      window.clearInterval(timer)
      window.removeEventListener("pagehide", clearLocalData)
    }
  }, [])

  useEffect(() => {
    if (check === "closed") clearLocalData()
  }, [check])

  const choose = (next: Page) => {
    setPage(next)
    try {
      window.history.replaceState(null, "", next === "analytics" ? "#analytics" : window.location.pathname + window.location.search)
    } catch {}
  }

  if (check === "checking") {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="กำลังโหลด" />
      </Centered>
    )
  }

  if (check !== "ok") {
    return (
      <Centered>
        <div className={`${card} flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pru-red-soft text-brand-ink">
            <Icon name={check === "closed" ? "lock" : "warning"} size={28} />
          </span>
          <h2 className="text-lg font-bold">{check === "closed" ? "ลิงก์นี้ใช้ไม่ได้แล้ว" : "เชื่อมต่อไม่สำเร็จ"}</h2>
          {check === "failed" && (
            <button type="button" onClick={() => window.location.reload()} className={cardButton}>
              ลองใหม่
            </button>
          )}
        </div>
      </Centered>
    )
  }

  return (
    // The page's own bottom space is for the phone menu, which this page does not have
    <div className="-mb-16 lg:mb-0">
      <div className="mx-auto flex max-w-[1360px] px-4 pt-4 sm:px-8">
        <div role="tablist" aria-label="หน้า" className="inline-flex gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {PAGES.map((p) => {
            const on = p.value === page
            return (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => choose(p.value)}
                className={`touch-target inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${on ? "bg-pru-red text-white" : "text-ink-soft hover:text-ink"}`}
              >
                <Icon name={p.icon} size={17} />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
      {page === "timeline" ? <ProductTimeline /> : <AnalyticsView />}
    </div>
  )
}
