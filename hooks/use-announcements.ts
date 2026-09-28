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
  triggerLineAnnouncementBroadcast,
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
      await saveAnnouncementsToCloud(pruned);
    } catch (err) {
      console.error("Failed to save announcements to cloud:", err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Check scheduled announcements: auto-trigger if scheduled time has passed
  useEffect(() => {
    if (!isLoaded || announcements.length === 0) return;

    const now = Date.now();
    let hasChanges = false;

    const updated = announcements.map((item) => {
      if (item.status === "pending" && item.scheduledAt) {
        const schedTime = new Date(item.scheduledAt).getTime();
        if (!isNaN(schedTime) && schedTime <= now) {
          hasChanges = true;
          // Trigger broadcast through Bot
          triggerLineAnnouncementBroadcast(item).catch(console.error);
          return {
            ...item,
            status: "sent" as const,
            sentAt: new Date().toISOString(),
          };
        }
      }
      return item;
    });

    if (hasChanges) {
      syncStore(updated);
    }
  }, [isLoaded, announcements, syncStore]);

  // Add new announcement
  const addAnnouncement = useCallback(
    async (
      payload: Omit<AnnouncementItem, "id" | "createdAt">,
      sendNowImmediately = false
    ) => {
      const nowIso = new Date().toISOString();
      const status = sendNowImmediately ? "sent" : payload.status;
      const sentAt = sendNowImmediately ? nowIso : payload.sentAt;

      const newItem: AnnouncementItem = {
        ...payload,
        id: `ann-${Date.now()}`,
        status,
        sentAt,
        createdAt: nowIso,
      };

      const nextList = [newItem, ...announcements];
      await syncStore(nextList);

      if (sendNowImmediately) {
        await triggerLineAnnouncementBroadcast(newItem);
      }

      return newItem;
    },
    [announcements, syncStore]
  );

  // Update existing announcement
  const updateAnnouncement = useCallback(
    async (id: string, updates: Partial<AnnouncementItem>) => {
      const nextList = announcements.map((item) =>
        item.id === id ? { ...item, ...updates } : item
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

  // Manual immediate broadcast trigger (e.g. from Admin button)
  const broadcastNow = useCallback(
    async (id: string) => {
      const target = announcements.find((item) => item.id === id);
      if (!target) return;

      const nowIso = new Date().toISOString();
      const updatedItem: AnnouncementItem = {
        ...target,
        status: "sent",
        sentAt: nowIso,
      };

      const nextList = announcements.map((item) =>
        item.id === id ? updatedItem : item
      );

      await syncStore(nextList);
      await triggerLineAnnouncementBroadcast(updatedItem);
    },
    [announcements, syncStore]
  );

  // Filtered announcements list
  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter((item) => {
        if (filterStatus === "sent") return item.status === "sent";
        if (filterStatus === "pending") return item.status === "pending";
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
    return { total, sent, pending };
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
