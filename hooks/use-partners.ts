"use client"

import { useCallback, useEffect, useState } from "react"
import { DEFAULT_PARTNERS, Partner, partnerOf } from "@/lib/partners"
import { fetchPartnersFromCloud, savePartnersToCloud } from "@/lib/supabase"

const CACHE_KEY = "pru_partners_v1"
const EVENT = "pru_partners_updated"

function readCache(): Partner[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Partners and channels from Supabase, cached locally so colours show at once */
export function usePartners() {
  // Starts from the defaults so the static HTML and the first client render match
  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS)

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      const cached = readCache()
      if (alive && cached) setPartners(cached)
    })
    fetchPartnersFromCloud().then((items) => {
      if (!alive || !items || items.length === 0) return
      setPartners(items)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items))
      } catch {}
    })
    const onUpdate = () => {
      const next = readCache()
      if (next) setPartners(next)
    }
    window.addEventListener(EVENT, onUpdate)
    return () => {
      alive = false
      window.removeEventListener(EVENT, onUpdate)
    }
  }, [])

  /** Saves to the cloud (admin only); keeps the old list when the save fails */
  const savePartners = useCallback(async (next: Partner[]) => {
    const res = await savePartnersToCloud(next)
    if (res.success) {
      setPartners(next)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event(EVENT))
      } catch {}
    }
    return res
  }, [])

  const getPartner = useCallback(
    (channel?: string) => partnerOf(channel, partners),
    [partners]
  )

  return { partners, savePartners, getPartner }
}
