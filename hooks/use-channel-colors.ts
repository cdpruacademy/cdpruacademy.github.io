"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_BROKER_COLORS,
  BROKER_COLORS_KEY,
  resolveBrokerColor,
} from "@/lib/broker-colors";
import { MonthlyStore } from "@/lib/timeline-data";

const PALETTE = [
  "#7E1518", // CIMB Burgundy
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#14B8A6", // Teal
];

export function useChannelColors(monthlyStore?: MonthlyStore | null) {
  const [colorMap, setColorMap] = useState<Record<string, string>>(DEFAULT_BROKER_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync function that merges stored colors, defaults, and any brokers found in monthlyStore
  const syncColors = useCallback((store?: MonthlyStore | null) => {
    try {
      const stored = localStorage.getItem(BROKER_COLORS_KEY);
      let merged: Record<string, string> = { ...DEFAULT_BROKER_COLORS };

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          merged = { ...merged, ...parsed };
        }
      }

      // Scan monthlyStore for all used brokers (e.g. CIMB, D2C, etc.)
      let hasNewBroker = false;
      if (store) {
        const existingKeysLower = Object.keys(merged).map((k) => k.toLowerCase().trim());
        let paletteIndex = 0;

        Object.values(store).forEach((m) => {
          [...(m.products || []), ...(m.enhancements || [])].forEach((p) => {
            if (p.broker && p.broker.trim()) {
              const bName = p.broker.trim();
              const bLower = bName.toLowerCase();
              if (!existingKeysLower.includes(bLower)) {
                let defaultCol = resolveBrokerColor(bName, merged);
                if (defaultCol === "#334155") {
                  defaultCol = PALETTE[paletteIndex % PALETTE.length];
                  paletteIndex++;
                }
                merged[bName] = defaultCol;
                existingKeysLower.push(bLower);
                hasNewBroker = true;
              }
            }
          });
        });
      }

      if (hasNewBroker) {
        localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(merged));
      }

      setColorMap(merged);
    } catch (e) {
      console.error("Failed to load channel colors", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Initial load and whenever monthlyStore changes
  useEffect(() => {
    syncColors(monthlyStore);
  }, [monthlyStore, syncColors]);

  // Listen for storage events (e.g. across tabs or same-tab custom events)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BROKER_COLORS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setColorMap((prev) => ({ ...prev, ...parsed }));
        } catch (_) {}
      }
    };

    const handleCustomChange = () => {
      syncColors(monthlyStore);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pru_colors_updated", handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pru_colors_updated", handleCustomChange);
    };
  }, [monthlyStore, syncColors]);

  const updateChannelColor = useCallback((broker: string, hex: string) => {
    setColorMap((prev) => {
      const existingKey =
        Object.keys(prev).find(
          (k) => k.toLowerCase().trim() === broker.toLowerCase().trim()
        ) || broker;
      const updated = { ...prev, [existingKey]: hex };
      try {
        localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("pru_colors_updated"));
      } catch (_) {}
      return updated;
    });
  }, []);

  const addChannel = useCallback((broker: string, hex: string) => {
    setColorMap((prev) => {
      const updated = { ...prev, [broker]: hex };
      try {
        localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("pru_colors_updated"));
      } catch (_) {}
      return updated;
    });
  }, []);

  const deleteChannel = useCallback((broker: string) => {
    setColorMap((prev) => {
      const updated = { ...prev };
      const existingKey =
        Object.keys(updated).find(
          (k) => k.toLowerCase().trim() === broker.toLowerCase().trim()
        ) || broker;
      delete updated[existingKey];
      try {
        localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("pru_colors_updated"));
      } catch (_) {}
      return updated;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setColorMap(DEFAULT_BROKER_COLORS);
    try {
      localStorage.setItem(BROKER_COLORS_KEY, JSON.stringify(DEFAULT_BROKER_COLORS));
      window.dispatchEvent(new Event("pru_colors_updated"));
    } catch (_) {}
  }, []);

  return {
    colorMap,
    isLoaded,
    updateChannelColor,
    addChannel,
    deleteChannel,
    resetToDefault,
    getBrokerColor: (broker?: string) => resolveBrokerColor(broker, colorMap),
  };
}
