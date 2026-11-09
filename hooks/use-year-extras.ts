"use client"

import { useEffect, useMemo, useState } from "react"
import { AuditWork, Refresher, auditPeriod, fetchAudits, fetchRefreshers } from "@/lib/difficulty"
import { subscribeToStoreRow } from "@/lib/supabase"
import { auditToItem, refresherToItem } from "@/lib/team-metrics"
import { ProductItem } from "@/lib/timeline-data"

/**
 * Refresher and Audit work of one year, as items for the partner summary image, so the image counts the same
 * projects as Analytics. ready turns true once both have been read (or failed), so the image waits for them.
 */
export function useYearExtras(year: number, enabled: boolean) {
  const [refreshers, setRefreshers] = useState<Refresher[] | null>(null)
  const [audits, setAudits] = useState<AuditWork[] | null>(null)
  const [readyR, setReadyR] = useState(false)
  const [readyA, setReadyA] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const loadR = () =>
      fetchRefreshers().then((list) => {
        if (!alive) return
        if (list) setRefreshers(list)
        setReadyR(true)
      })
    const loadA = () =>
      fetchAudits().then((list) => {
        if (!alive) return
        if (list) setAudits(list)
        setReadyA(true)
      })
    loadR()
    loadA()
    const offR = subscribeToStoreRow("refreshers", loadR)
    const offA = subscribeToStoreRow("audits", loadA)
    return () => {
      alive = false
      offR()
      offA()
    }
  }, [enabled])

  const items = useMemo(
    () => ({
      refreshers: (refreshers ?? []).filter((r) => r.year === year).map(refresherToItem) as ProductItem[],
      audits: (audits ?? []).filter((a) => auditPeriod(a).year === year).map(auditToItem) as ProductItem[],
    }),
    [refreshers, audits, year]
  )

  return { ...items, ready: readyR && readyA }
}
