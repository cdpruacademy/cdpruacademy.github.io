"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AnnouncementItem,
  INITIAL_ANNOUNCEMENTS,
  filterWithinOneYear,
} from "@/lib/announcement-data";
import {
  fetchAnnouncementsFromCloud,
  saveAnnouncementsToCloud,
} from "@/lib/supabase";

const ANNOUNCEMENTS_STORAGE_KEY = "pru_announcements_cache_v1";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "sent" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize announcements from Supabase Cloud (with offline cache fallback)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Try local cache first for instant display
      try {
        const cached = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAnnouncements(filterWithinOneYear(parsed));
          }
        }
      } catch (_) {}

      // 2. Fetch fresh data from Supabase Cloud DB
      try {
        const cloudItems = await fetchAnnouncementsFromCloud();
        if (isMounted) {
          if (cloudItems && Array.isArray(cloudItems)) {
            const validItems = filterWithinOneYear(cloudItems);
            setAnnouncements(validItems);
            try {
              localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(validItems));
            } catch (_) {}
          } else {
            // First time seeding with initial sample data
            const initial = filterWithinOneYear(INITIAL_ANNOUNCEMENTS);
            setAnnouncements(initial);
            await saveAnnouncementsToCloud(initial);
            try {
              localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(initial));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Failed to fetch cloud announcements:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to persist to both cloud and local cache
  const syncStore = useCallback(async (newItems: AnnouncementItem[]) => {
    const pruned = filterWithinOneYear(newItems);
    setAnnouncements(pruned);
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(pruned));
    } catch (_) {}

    setIsSaving(true);
    try {
      const res = await saveAnnouncementsToCloud(pruned);
      if (!res.success) throw new Error(res.error || "บันทึกประกาศไม่สำเร็จ");
      // The saved list may include send results the bot wrote in the meantime
      if (res.items) setAnnouncements(res.items);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // The LINE bot sends queued items and records the result in the cloud row:
  // refresh every 30 seconds while anything is still waiting to be sent
  const hasPending = announcements.some((a) => a.status === "pending");
  useEffect(() => {
    if (!isLoaded || !hasPending) return;
    const timer = setInterval(async () => {
      const cloudItems = await fetchAnnouncementsFromCloud();
      if (!cloudItems) return;
      setAnnouncements((prev) => {
        const cloudById = new Map(cloudItems.map((c) => [c.id, c]));
        return prev.map((item) => {
          const c = cloudById.get(item.id);
          return c && c.processedQueuedAt && c.processedQueuedAt === item.queuedAt
            ? { ...item, status: c.status, sentAt: c.sentAt, sendError: c.sendError, processedQueuedAt: c.processedQueuedAt }
            : item;
        });
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [isLoaded, hasPending]);

  // Fields that put an item in the bot's queue: now, or at the scheduled time
  const queueFields = (sendNow: boolean, scheduledAt: string) => {
    const nowIso = new Date().toISOString();
    return {
      status: "pending" as const,
      scheduledAt: sendNow ? nowIso : scheduledAt,
      queuedAt: nowIso,
      sentAt: undefined,
      sendError: undefined,
    };
  };

  // Add new announcement (always queued: the bot does the actual sending)
  const addAnnouncement = useCallback(
    async (
      payload: Omit<AnnouncementItem, "id" | "createdAt">,
      sendNowImmediately = false
    ) => {
      const newItem: AnnouncementItem = {
        ...payload,
        ...queueFields(sendNowImmediately, payload.scheduledAt),
        id: `ann-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      await syncStore([newItem, ...announcements]);
      return newItem;
    },
    [announcements, syncStore]
  );

  // Update existing announcement and queue it again (saving from the form re-sends it)
  const updateAnnouncement = useCallback(
    async (id: string, updates: Partial<AnnouncementItem>, sendNowImmediately = false) => {
      const nextList = announcements.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              ...queueFields(sendNowImmediately, updates.scheduledAt || item.scheduledAt),
            }
          : item
      );
      await syncStore(nextList);
    },
    [announcements, syncStore]
  );

  // Delete announcement
  const deleteAnnouncement = useCallback(
    async (id: string) => {
      const nextList = announcements.filter((item) => item.id !== id);
      await syncStore(nextList);
    },
    [announcements, syncStore]
  );

  // Send now / resend from the card button: queue it for the bot's next run
  const broadcastNow = useCallback(
    async (id: string) => {
      const nextList = announcements.map((item) =>
        item.id === id ? { ...item, ...queueFields(true, item.scheduledAt) } : item
      );
      await syncStore(nextList);
    },
    [announcements, syncStore]
  );

  // Filtered announcements list
  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter((item) => {
        if (filterStatus === "sent") return item.status === "sent";
        if (filterStatus === "pending") return item.status === "pending" || item.status === "failed";
        return true;
      })
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements, filterStatus, searchQuery]);

  // Statistics summary
  const stats = useMemo(() => {
    const total = announcements.length;
    const sent = announcements.filter((a) => a.status === "sent").length;
    const pending = announcements.filter((a) => a.status === "pending").length;
    const failed = announcements.filter((a) => a.status === "failed").length;
    return { total, sent, pending, failed };
  }, [announcements]);

  return {
    announcements: filteredAnnouncements,
    allCount: announcements.length,
    stats,
    isLoaded,
    isSaving,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    broadcastNow,
  };
}
