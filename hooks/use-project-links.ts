"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ProjectLink,
  ProjectLinkMap,
  fetchProjectLinksFromCloud,
  saveProjectLinksToCloud,
} from "@/lib/supabase"

// One copy for every row on the page: fetched once, shared through listeners
let shared: ProjectLinkMap = {}
let loading: Promise<void> | null = null
const listeners = new Set<(links: ProjectLinkMap) => void>()

function publish(next: ProjectLinkMap) {
  shared = next
  listeners.forEach((fn) => fn(next))
}

/** Final-file links per project. Admin only: the cloud row is not public. */
export function useProjectLinks(enabled: boolean) {
  const [links, setLinks] = useState<ProjectLinkMap>(shared)

  useEffect(() => {
    if (!enabled) return
    listeners.add(setLinks)
    if (!loading) {
      loading = fetchProjectLinksFromCloud().then((map) => {
        if (map) publish(map)
        else loading = null // try again next time
      })
    } else {
      queueMicrotask(() => setLinks(shared))
    }
    return () => {
      listeners.delete(setLinks)
    }
  }, [enabled])

  const saveLinks = useCallback(async (projectId: string, next: ProjectLink[]) => {
    const res = await saveProjectLinksToCloud(projectId, next)
    if (res.success && res.links) publish(res.links)
    return res
  }, [])

  return { links, saveLinks }
}
