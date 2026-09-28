"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ProductItem,
  TimelineType,
  INITIAL_PRODUCTS,
  INITIAL_ENHANCEMENTS,
  AVAILABLE_MONTHS,
  MonthlyStore,
  INITIAL_MONTHLY_STORE,
  DEFAULT_AS_OF_BY_MONTH,
  getSystemCurrentMonth,
  parseMonthYear,
  MONTH_NAMES,
} from "@/lib/timeline-data";
import { exportTimelineToExcel, exportTimelineToJSON } from "@/lib/excel-service";
import {
  getStoredSupabaseConfig,
  fetchTimelineFromCloud,
  saveTimelineToCloud,
  subscribeToTimelineCloud,
} from "@/lib/supabase";

const MONTHLY_STORAGE_KEY = "pru_dashboard_monthly_v3";
const AVAILABLE_MONTHS_KEY = "pru_available_months_v3";
const ACTIVE_MONTH_KEY = "pru_active_month_v3";

export function useProducts() {
  const defaultCurrentMonth = getSystemCurrentMonth();
  const [timelineType, setTimelineType] = useState<TimelineType>("product");
  const [availableMonths, setAvailableMonths] = useState<string[]>(AVAILABLE_MONTHS);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultCurrentMonth);
  const [monthlyStore, setMonthlyStore] = useState<MonthlyStore>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize strictly from Supabase Cloud DB (with cached data only as instant offline mirror)
  useEffect(() => {
    let isMounted = true;

    async function initializeFromCloud() {
      const realMonth = getSystemCurrentMonth();
      // 1. Read locally cached active month and available months for immediate tab structure
      try {
        const storedMonths = localStorage.getItem(AVAILABLE_MONTHS_KEY);
        if (storedMonths) {
          const parsed = JSON.parse(storedMonths);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableMonths(parsed);
          }
        }

        const storedActiveMonth = localStorage.getItem(ACTIVE_MONTH_KEY);
        if (storedActiveMonth && storedActiveMonth !== "AUG 2026") {
          setSelectedMonth(storedActiveMonth);
        } else {
          setSelectedMonth(realMonth);
        }

        // Check if we have cached cloud data in localStorage
        const storedData = localStorage.getItem(MONTHLY_STORAGE_KEY);
        if (storedData) {
          const parsed: MonthlyStore = JSON.parse(storedData);
          if (parsed && typeof parsed === "object") {
            setMonthlyStore(parsed);
          }
        }
      } catch (_) {}

      // 2. Fetch authoritative single source of truth from Supabase
      const config = getStoredSupabaseConfig();
      if (config) {
        setIsSyncing(true);
        try {
          const cloudData = await fetchTimelineFromCloud();
          if (!isMounted) return;

          if (cloudData && cloudData.monthlyStore && typeof cloudData.monthlyStore === "object") {
            // Found data in Supabase - use it directly
            setMonthlyStore(cloudData.monthlyStore);
            if (cloudData.availableMonths && cloudData.availableMonths.length > 0) {
              setAvailableMonths(cloudData.availableMonths);
            }
            if (cloudData.activeMonth && cloudData.activeMonth !== "AUG 2026") {
              setSelectedMonth(cloudData.activeMonth);
            } else {
              setSelectedMonth(realMonth);
            }
            setIsCloudConnected(true);

            // Update offline cache
            try {
              localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(cloudData.monthlyStore));
              if (cloudData.availableMonths) {
                localStorage.setItem(AVAILABLE_MONTHS_KEY, JSON.stringify(cloudData.availableMonths));
              }
            } catch (_) {}
          } else {
            // First time setup or empty database: initialize clean structure for available months without dummy data
            const emptyStore: MonthlyStore = {};
            AVAILABLE_MONTHS.forEach((m) => {
              emptyStore[m] = {
                products: [],
                enhancements: [],
                asOfText: DEFAULT_AS_OF_BY_MONTH[m] || `as of 15 ${m.split(" ")[0]}`,
              };
            });
            setMonthlyStore(emptyStore);
            setIsCloudConnected(true);
            saveTimelineToCloud({
              monthlyStore: emptyStore,
              availableMonths: AVAILABLE_MONTHS,
              activeMonth: realMonth,
            }).catch(() => {});
          }
        } catch (err) {
          console.warn("Could not fetch cloud data:", err);
        } finally {
          if (isMounted) {
            setIsSyncing(false);
            setIsLoaded(true);
          }
        }
      } else {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initializeFromCloud();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to Supabase Realtime changes
  useEffect(() => {
    if (!isCloudConnected) return;

    const unsubscribe = subscribeToTimelineCloud((cloudData) => {
      if (cloudData && cloudData.monthlyStore) {
        setMonthlyStore(cloudData.monthlyStore);
        if (cloudData.availableMonths && cloudData.availableMonths.length > 0) {
          setAvailableMonths(cloudData.availableMonths);
        }
        try {
          localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(cloudData.monthlyStore));
        } catch (_) {}
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudConnected]);

  // Unified save & cloud sync helper (persists store without redundant state setter)
  const syncStore = useCallback(
    (updatedStore: MonthlyStore, customMonths?: string[], customActiveMonth?: string) => {
      try {
        localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(updatedStore));
      } catch (_) {}

      // Async sync to cloud if configured
      const config = getStoredSupabaseConfig();
      if (config) {
        setIsSyncing(true);
        saveTimelineToCloud({
          monthlyStore: updatedStore,
          availableMonths: customMonths || availableMonths,
          activeMonth: customActiveMonth || selectedMonth,
        })
          .then((res) => {
            setIsSyncing(false);
            if (res.success) {
              setIsCloudConnected(true);
            }
          })
          .catch(() => {
            setIsSyncing(false);
          });
      }
    },
    [availableMonths, selectedMonth]
  );

  // Switch active month
  const handleSetSelectedMonth = useCallback(
    (newMonth: string) => {
      setSelectedMonth(newMonth);
      try {
        localStorage.setItem(ACTIVE_MONTH_KEY, newMonth);
      } catch (_) {}

      // If month doesn't exist in store yet, initialize it
      setMonthlyStore((prev) => {
        if (!prev[newMonth]) {
          const defaultAsOf = DEFAULT_AS_OF_BY_MONTH[newMonth] || `as of 15 ${newMonth.split(" ")[0]}`;
          const updated: MonthlyStore = {
            ...prev,
            [newMonth]: {
              products: [],
              enhancements: [],
              asOfText: defaultAsOf,
            },
          };
          syncStore(updated, undefined, newMonth);
          return updated;
        }
        return prev;
      });
    },
    [syncStore]
  );

  // Active month data
  const currentMonthData = useMemo(() => {
    return (
      monthlyStore[selectedMonth] || {
        products: [],
        enhancements: [],
        asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || "as of 15th",
      }
    );
  }, [monthlyStore, selectedMonth]);

  const asOfText = currentMonthData.asOfText;

  // Change As Of text for current month
  const handleSetAsOfText = useCallback(
    (newAsOf: string) => {
      setMonthlyStore((prev) => {
        const monthObj = prev[selectedMonth] || {
          products: [],
          enhancements: [],
          asOfText: newAsOf,
        };
        const updated: MonthlyStore = {
          ...prev,
          [selectedMonth]: {
            ...monthObj,
            asOfText: newAsOf,
          },
        };
        syncStore(updated);
        return updated;
      });
    },
    [selectedMonth, syncStore]
  );

  // Helper: check if a target launch date or label matches a target month (e.g. "2 Oct 2026" or "Oct 2026" matches "OCT 2026")
  const matchesTargetMonth = useCallback((dateStr: string | undefined, targetMonth: string) => {
    if (!dateStr) return false;
    const cleanStr = dateStr.trim().toLowerCase();
    const cleanTarget = targetMonth.trim().toLowerCase(); // e.g. "oct 2026"
    const [targetM, targetY] = cleanTarget.split(" "); // "oct", "2026"

    // If string is TBC or empty
    if (cleanStr.includes("tbc")) return false;

    // Check month abbreviation (3-4 chars)
    const monthPrefix = targetM.slice(0, 3);
    const hasMonth = cleanStr.includes(monthPrefix);
    // If year exists, check year
    const hasYear = targetY ? cleanStr.includes(targetY) : true;

    return hasMonth && hasYear;
  }, []);

  // Active items based on tab + Option A: Auto include products from other months whose Target Launch matches selectedMonth
  const currentItems = useMemo(() => {
    const nativeList = timelineType === "product" ? currentMonthData.products : currentMonthData.enhancements;
    const nativeIds = new Set(nativeList.map((p) => p.id));

    // Find cross-month items from other months
    const crossMonthItems: ProductItem[] = [];

    const targetParsed = parseMonthYear(selectedMonth);

    Object.entries(monthlyStore).forEach(([mKey, mData]) => {
      // Don't duplicate native month
      if (mKey.toUpperCase() === selectedMonth.toUpperCase()) return;

      const items = timelineType === "product" ? mData.products : mData.enhancements;
      if (!items || !Array.isArray(items)) return;

      const sourceParsed = parseMonthYear(mKey);
      const isPriorMonth = sourceParsed && targetParsed
        ? sourceParsed.year < targetParsed.year || (sourceParsed.year === targetParsed.year && sourceParsed.monthIndex < targetParsed.monthIndex)
        : false;

      items.forEach((item) => {
        // Skip if already in native month (by ID or exact match)
        if (nativeIds.has(item.id)) return;

        // Auto carryover: any item from prior month that has not launched in the past yet
        let hasLaunchedInPast = false;
        if (item.milestones?.launch?.status === "completed") {
          hasLaunchedInPast = true;
        } else if (item.commercialDate && !item.commercialDate.toLowerCase().includes("tbc")) {
          const cClean = item.commercialDate.toLowerCase();
          for (let i = 0; i < MONTH_NAMES.length; i++) {
            if (cClean.includes(MONTH_NAMES[i].toLowerCase().slice(0, 3))) {
              const yMatch = cClean.match(/\b(20\d{2}|25\d{2})\b/);
              const cYear = yMatch ? parseInt(yMatch[0], 10) : targetParsed?.year || 2026;
              if (targetParsed) {
                if (cYear < targetParsed.year || (cYear === targetParsed.year && i < targetParsed.monthIndex)) {
                  hasLaunchedInPast = true;
                }
              }
              break;
            }
          }
        }

        const isUnfinishedInPrior = isPriorMonth && !hasLaunchedInPast;

        // Check commercialDate first, then internalDate, then customRightLabel, or unfinished from prior
        const isMatch =
          matchesTargetMonth(item.commercialDate, selectedMonth) ||
          matchesTargetMonth(item.internalDate, selectedMonth) ||
          matchesTargetMonth(item.customRightLabel, selectedMonth) ||
          isUnfinishedInPrior;

        if (isMatch) {
          crossMonthItems.push({
            ...item,
            isCrossMonth: true,
            originalMonth: mKey,
          });
        }
      });
    });

    return [...nativeList, ...crossMonthItems];
  }, [timelineType, currentMonthData, monthlyStore, selectedMonth, matchesTargetMonth]);

  // CRUD Operations
  const addProduct = useCallback(
    (product: Omit<ProductItem, "id">) => {
      const newItem: ProductItem = {
        ...product,
        id: `${timelineType === "product" ? "pru" : "enh"}-${Date.now()}`,
        month: selectedMonth,
      };

      setMonthlyStore((prev) => {
        const monthObj = prev[selectedMonth] || {
          products: [],
          enhancements: [],
          asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || "as of 15th",
        };

        const updatedMonth =
          timelineType === "product"
            ? { ...monthObj, products: [...monthObj.products, newItem] }
            : { ...monthObj, enhancements: [...monthObj.enhancements, newItem] };

        const updated: MonthlyStore = {
          ...prev,
          [selectedMonth]: updatedMonth,
        };
        syncStore(updated);
        return updated;
      });

      return newItem;
    },
    [timelineType, selectedMonth, syncStore]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<ProductItem>) => {
      setMonthlyStore((prev) => {
        // Find which month contains this product (default to selectedMonth)
        let targetMonth = selectedMonth;
        for (const [mKey, mData] of Object.entries(prev)) {
          const list = timelineType === "product" ? mData.products : mData.enhancements;
          if (list?.some((p) => p.id === id)) {
            targetMonth = mKey;
            break;
          }
        }

        const monthObj = prev[targetMonth];
        if (!monthObj) return prev;

        const updatedMonth =
          timelineType === "product"
            ? {
                ...monthObj,
                products: monthObj.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
              }
            : {
                ...monthObj,
                enhancements: monthObj.enhancements.map((p) => (p.id === id ? { ...p, ...updates } : p)),
              };

        const updated: MonthlyStore = {
          ...prev,
          [targetMonth]: updatedMonth,
        };
        syncStore(updated);
        return updated;
      });
    },
    [timelineType, selectedMonth, syncStore]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setMonthlyStore((prev) => {
        // Find which month actually contains this product
        let targetMonth = selectedMonth;
        for (const [mKey, mData] of Object.entries(prev)) {
          const list = timelineType === "product" ? mData.products : mData.enhancements;
          if (list?.some((p) => p.id === id)) {
            targetMonth = mKey;
            break;
          }
        }

        const monthObj = prev[targetMonth];
        if (!monthObj) return prev;

        const updatedMonth =
          timelineType === "product"
            ? {
                ...monthObj,
                products: monthObj.products.filter((p) => p.id !== id),
              }
            : {
                ...monthObj,
                enhancements: monthObj.enhancements.filter((p) => p.id !== id),
              };

        const updated: MonthlyStore = {
          ...prev,
          [targetMonth]: updatedMonth,
        };
        syncStore(updated);
        return updated;
      });
    },
    [timelineType, selectedMonth, syncStore]
  );

  const resetToDefault = useCallback(() => {
    const confirmed = confirm(
      `คุณต้องการล้างข้อมูลทั้งหมดในรอบเดือน ${selectedMonth} หรือไม่?`
    );
    if (!confirmed) return;

    setMonthlyStore((prev) => {
      const defaultAsOf = DEFAULT_AS_OF_BY_MONTH[selectedMonth] || `as of 15 ${selectedMonth.split(" ")[0]}`;
      const emptyMonthData = {
        products: [],
        enhancements: [],
        asOfText: defaultAsOf,
      };

      const updated: MonthlyStore = {
        ...prev,
        [selectedMonth]: emptyMonthData,
      };
      syncStore(updated);
      return updated;
    });
  }, [selectedMonth, syncStore]);

  // Clone from previous month (useful for admins starting a new month)
  const copyFromPreviousMonth = useCallback(() => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex <= 0) {
      alert("ไม่มีข้อมูลรอบเดือนก่อนหน้าให้คัดลอก");
      return;
    }

    const prevMonthName = availableMonths[currentIndex - 1];
    const prevMonthData = monthlyStore[prevMonthName];
    if (!prevMonthData || (prevMonthData.products.length === 0 && prevMonthData.enhancements.length === 0)) {
      alert(`ไม่พบข้อมูลในรอบเดือน ${prevMonthName}`);
      return;
    }

    const confirmed = confirm(
      `คุณต้องการคัดลอกรายการจากเดือน ${prevMonthName} มายัง ${selectedMonth} หรือไม่? (ข้อมูลเดิมใน ${selectedMonth} จะถูกแทนที่)`
    );
    if (!confirmed) return;

    // Deep clone with new IDs
    const clonedProducts: ProductItem[] = prevMonthData.products.map((p, idx) => ({
      ...p,
      id: `pru-${Date.now()}-${idx}`,
      month: selectedMonth,
    }));

    const clonedEnhancements: ProductItem[] = prevMonthData.enhancements.map((e, idx) => ({
      ...e,
      id: `enh-${Date.now()}-${idx}`,
      month: selectedMonth,
    }));

    setMonthlyStore((prev) => {
      const updated: MonthlyStore = {
        ...prev,
        [selectedMonth]: {
          products: clonedProducts,
          enhancements: clonedEnhancements,
          asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || `as of 15 ${selectedMonth.split(" ")[0]}`,
        },
      };
      syncStore(updated);
      return updated;
    });

    alert(`คัดลอกข้อมูลจาก ${prevMonthName} มายัง ${selectedMonth} สำเร็จเรียบร้อย`);
  }, [availableMonths, selectedMonth, monthlyStore, syncStore]);

  // Add a new month cycle
  const addNewMonth = useCallback(
    (monthName: string) => {
      const clean = monthName.trim().toUpperCase();
      if (!clean) return;
      if (availableMonths.includes(clean)) {
        alert("รอบเดือนนี้มีอยู่ในระบบแล้ว");
        setSelectedMonth(clean);
        return;
      }

      const updatedMonths = [...availableMonths, clean];
      setAvailableMonths(updatedMonths);
      try {
        localStorage.setItem(AVAILABLE_MONTHS_KEY, JSON.stringify(updatedMonths));
      } catch (_) {}

      handleSetSelectedMonth(clean);
    },
    [availableMonths, handleSetSelectedMonth]
  );

  // Bulk import
  const importItems = useCallback(
    (imported: ProductItem[]) => {
      setMonthlyStore((prev) => {
        const monthObj = prev[selectedMonth] || {
          products: [],
          enhancements: [],
          asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || "as of 15th",
        };

        const updatedMonth =
          timelineType === "product"
            ? { ...monthObj, products: imported }
            : { ...monthObj, enhancements: imported };

        const updated: MonthlyStore = {
          ...prev,
          [selectedMonth]: updatedMonth,
        };
        syncStore(updated);
        return updated;
      });
    },
    [timelineType, selectedMonth, syncStore]
  );

  // Direct load from cloud callback
  const handleCloudDataLoaded = useCallback(
    (store: MonthlyStore, months: string[], activeMonth?: string) => {
      setMonthlyStore(store);
      if (months && months.length > 0) {
        setAvailableMonths(months);
        try {
          localStorage.setItem(AVAILABLE_MONTHS_KEY, JSON.stringify(months));
        } catch (_) {}
      }
      if (activeMonth) {
        setSelectedMonth(activeMonth);
        try {
          localStorage.setItem(ACTIVE_MONTH_KEY, activeMonth);
        } catch (_) {}
      }
      try {
        localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(store));
      } catch (_) {}
      setIsCloudConnected(true);
    },
    []
  );

  // Excel & JSON export
  const exportExcel = useCallback(() => {
    const title = timelineType === "product" ? "Product Timeline" : "Enhancement Timeline";
    exportTimelineToExcel(currentItems, title, selectedMonth, asOfText);
  }, [timelineType, currentItems, selectedMonth, asOfText]);

  const exportJSON = useCallback(() => {
    const title = timelineType === "product" ? "product_timeline" : "enhancement_timeline";
    exportTimelineToJSON(currentItems, title, selectedMonth);
  }, [timelineType, currentItems, selectedMonth]);

  return {
    timelineType,
    setTimelineType,
    selectedMonth,
    setSelectedMonth: handleSetSelectedMonth,
    availableMonths,
    addNewMonth,
    copyFromPreviousMonth,
    asOfText,
    setAsOfText: handleSetAsOfText,
    currentItems,
    isLoaded,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToDefault,
    importItems,
    exportExcel,
    exportJSON,
    monthlyStore,
    isCloudConnected,
    setIsCloudConnected,
    isSyncing,
    handleCloudDataLoaded,
  };
}
