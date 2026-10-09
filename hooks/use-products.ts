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
  sortMonthsChronologically,
  ALL_YEAR_2026_MONTHS,
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
  const [availableMonths, setAvailableMonths] = useState<string[]>(sortMonthsChronologically(AVAILABLE_MONTHS));
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
        let currentAvailable = [...AVAILABLE_MONTHS];
        if (storedMonths) {
          const parsed = JSON.parse(storedMonths);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentAvailable = parsed;
          }
        }
        if (!currentAvailable.includes(realMonth)) {
          currentAvailable.push(realMonth);
        }
        currentAvailable = sortMonthsChronologically(currentAvailable);
        setAvailableMonths(currentAvailable);

        // Always prioritize realMonth on fresh load/rollover unless user explicitly chose a tab in current session
        const sessionActiveMonth = sessionStorage.getItem(ACTIVE_MONTH_KEY);
        if (sessionActiveMonth && currentAvailable.includes(sessionActiveMonth)) {
          setSelectedMonth(sessionActiveMonth);
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
            const store: MonthlyStore = { ...cloudData.monthlyStore };
            if (!store[realMonth]) {
              store[realMonth] = {
                products: [],
                enhancements: [],
                asOfText: DEFAULT_AS_OF_BY_MONTH[realMonth] || `as of 15 ${realMonth.split(" ")[0]}`,
              };
            }
            setMonthlyStore(store);

            let months = Array.isArray(cloudData.availableMonths) && cloudData.availableMonths.length > 0
              ? [...cloudData.availableMonths]
              : [...AVAILABLE_MONTHS];
            if (!months.includes(realMonth)) {
              months.push(realMonth);
            }
            months = sortMonthsChronologically(months);
            setAvailableMonths(months);

            // Auto-heal cloud database if months in Supabase were not sorted chronologically
            const isDifferentOrder =
              Array.isArray(cloudData.availableMonths) &&
              JSON.stringify(cloudData.availableMonths) !== JSON.stringify(months);
            if (isDifferentOrder) {
              saveTimelineToCloud({
                monthlyStore: store,
                availableMonths: months,
                activeMonth: realMonth,
              }).catch(() => {});
            }

            // Always select realMonth upon fresh load
            const sessionActiveMonth = sessionStorage.getItem(ACTIVE_MONTH_KEY);
            if (sessionActiveMonth && months.includes(sessionActiveMonth)) {
              setSelectedMonth(sessionActiveMonth);
            } else {
              setSelectedMonth(realMonth);
            }
            setIsCloudConnected(true);

            // Update offline cache
            try {
              localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(store));
              localStorage.setItem(AVAILABLE_MONTHS_KEY, JSON.stringify(months));
            } catch (_) {}
          } else {
            // First time setup or empty database: initialize clean structure for available months without dummy data
            const emptyStore: MonthlyStore = {};
            const months = sortMonthsChronologically(
              AVAILABLE_MONTHS.includes(realMonth) ? AVAILABLE_MONTHS : [...AVAILABLE_MONTHS, realMonth]
            );
            months.forEach((m) => {
              emptyStore[m] = {
                products: [],
                enhancements: [],
                asOfText: DEFAULT_AS_OF_BY_MONTH[m] || `as of 15 ${m.split(" ")[0]}`,
              };
            });
            setMonthlyStore(emptyStore);
            setAvailableMonths(months);
            setSelectedMonth(realMonth);
            setIsCloudConnected(true);
            saveTimelineToCloud({
              monthlyStore: emptyStore,
              availableMonths: months,
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
          setAvailableMonths(sortMonthsChronologically(cloudData.availableMonths));
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
        sessionStorage.setItem(ACTIVE_MONTH_KEY, newMonth);
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

  // Helper: compute all active items (including carryovers from prior months) for any month and timeline type
  const getItemsForMonth = useCallback(
    (month: string, type: TimelineType): ProductItem[] => {
      const monthData = monthlyStore[month] || {
        products: [],
        enhancements: [],
        asOfText: DEFAULT_AS_OF_BY_MONTH[month] || "as of 15th",
      };
      const rawNativeList = type === "product" ? monthData.products : monthData.enhancements;
      const nativeList = (rawNativeList || []).filter((p) => !p.isDeleted);
      const nativeIds = new Set((rawNativeList || []).map((p) => p.id));

      const crossMonthItems: ProductItem[] = [];
      const targetParsed = parseMonthYear(month);

      Object.entries(monthlyStore).forEach(([mKey, mData]) => {
        if (mKey.toUpperCase() === month.toUpperCase()) return;

        const items = type === "product" ? mData.products : mData.enhancements;
        if (!items || !Array.isArray(items)) return;

        const sourceParsed = parseMonthYear(mKey);
        const isPriorMonth = sourceParsed && targetParsed
          ? sourceParsed.year < targetParsed.year || (sourceParsed.year === targetParsed.year && sourceParsed.monthIndex < targetParsed.monthIndex)
          : false;

        items.forEach((item) => {
          if (item.isDeleted || nativeIds.has(item.id)) return;

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

          const isMatch =
            matchesTargetMonth(item.commercialDate, month) ||
            matchesTargetMonth(item.internalDate, month) ||
            matchesTargetMonth(item.customRightLabel, month) ||
            isUnfinishedInPrior;

          if (isMatch) {
            crossMonthItems.push({
              ...item,
              isCrossMonth: false,
              originalMonth: mKey,
            });
          }
        });
      });

      return [...nativeList, ...crossMonthItems];
    },
    [monthlyStore, matchesTargetMonth]
  );

  const currentProductItems = useMemo(() => {
    return getItemsForMonth(selectedMonth, "product");
  }, [getItemsForMonth, selectedMonth]);

  const currentEnhancementItems = useMemo(() => {
    return getItemsForMonth(selectedMonth, "enhancement");
  }, [getItemsForMonth, selectedMonth]);

  const currentItems = useMemo(() => {
    return timelineType === "product" ? currentProductItems : currentEnhancementItems;
  }, [timelineType, currentProductItems, currentEnhancementItems]);

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
        const currentMonthObj = prev[selectedMonth] || {
          products: [],
          enhancements: [],
          asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || "as of 15th",
        };
        const currentList =
          timelineType === "product" ? currentMonthObj.products : currentMonthObj.enhancements;
        const isNativeInCurrentMonth = currentList?.some((p) => p.id === id);

        if (isNativeInCurrentMonth) {
          // Item already belongs to selectedMonth: update in-place
          const updatedMonth =
            timelineType === "product"
              ? {
                  ...currentMonthObj,
                  products: currentMonthObj.products.map((p) =>
                    p.id === id ? { ...p, ...updates, isCrossMonth: false } : p
                  ),
                }
              : {
                  ...currentMonthObj,
                  enhancements: currentMonthObj.enhancements.map((p) =>
                    p.id === id ? { ...p, ...updates, isCrossMonth: false } : p
                  ),
                };

          const updated: MonthlyStore = {
            ...prev,
            [selectedMonth]: updatedMonth,
          };
          syncStore(updated);
          return updated;
        }

        // Item carried over from an earlier month: clone/fork it into selectedMonth
        // so changes are saved in the current month while preserving earlier month's history!
        let sourceItem: ProductItem | undefined;
        for (const mData of Object.values(prev)) {
          const list = timelineType === "product" ? mData.products : mData.enhancements;
          const found = list?.find((p) => p.id === id);
          if (found) {
            sourceItem = found;
            break;
          }
        }

        if (!sourceItem) return prev;

        const forkedItem: ProductItem = {
          ...sourceItem,
          ...updates,
          month: selectedMonth,
          isCrossMonth: false,
        };

        const updatedMonth =
          timelineType === "product"
            ? {
                ...currentMonthObj,
                products: [...(currentMonthObj.products || []), forkedItem],
              }
            : {
                ...currentMonthObj,
                enhancements: [...(currentMonthObj.enhancements || []), forkedItem],
              };

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

  const deleteProduct = useCallback(
    (id: string) => {
      setMonthlyStore((prev) => {
        const currentMonthObj = prev[selectedMonth] || {
          products: [],
          enhancements: [],
          asOfText: DEFAULT_AS_OF_BY_MONTH[selectedMonth] || "as of 15th",
        };
        const currentList =
          timelineType === "product" ? currentMonthObj.products : currentMonthObj.enhancements;
        const isNativeInCurrentMonth = currentList?.some((p) => p.id === id);

        if (isNativeInCurrentMonth) {
          // Check if this item also exists in an earlier month
          let existsInEarlierMonth = false;
          for (const [mKey, mData] of Object.entries(prev)) {
            if (mKey === selectedMonth) continue;
            const list = timelineType === "product" ? mData.products : mData.enhancements;
            if (list?.some((p) => p.id === id)) {
              existsInEarlierMonth = true;
              break;
            }
          }

          if (existsInEarlierMonth) {
            // Mark tombstone in selectedMonth so auto-carryover doesn't pull it back into selectedMonth
            const updatedMonth =
              timelineType === "product"
                ? {
                    ...currentMonthObj,
                    products: currentMonthObj.products.map((p) =>
                      p.id === id ? { ...p, isDeleted: true } : p
                    ),
                  }
                : {
                    ...currentMonthObj,
                    enhancements: currentMonthObj.enhancements.map((p) =>
                      p.id === id ? { ...p, isDeleted: true } : p
                    ),
                  };

            const updated: MonthlyStore = {
              ...prev,
              [selectedMonth]: updatedMonth,
            };
            syncStore(updated);
            return updated;
          } else {
            // Native only in selectedMonth: filter out
            const updatedMonth =
              timelineType === "product"
                ? {
                    ...currentMonthObj,
                    products: currentMonthObj.products.filter((p) => p.id !== id),
                  }
                : {
                    ...currentMonthObj,
                    enhancements: currentMonthObj.enhancements.filter((p) => p.id !== id),
                  };

            const updated: MonthlyStore = {
              ...prev,
              [selectedMonth]: updatedMonth,
            };
            syncStore(updated);
            return updated;
          }
        }

        // If carried over from earlier month, record a tombstone in selectedMonth
        // so it disappears from selectedMonth without deleting from earlier month
        let sourceItem: ProductItem | undefined;
        for (const mData of Object.values(prev)) {
          const list = timelineType === "product" ? mData.products : mData.enhancements;
          const found = list?.find((p) => p.id === id);
          if (found) {
            sourceItem = found;
            break;
          }
        }

        const tombstoneItem: ProductItem = {
          ...(sourceItem || {
            id,
            broker: "ttb",
            name: "",
            owner: "",
            milestones: {},
          }),
          id,
          month: selectedMonth,
          isDeleted: true,
        };

        const updatedMonth =
          timelineType === "product"
            ? {
                ...currentMonthObj,
                products: [...(currentMonthObj.products || []), tombstoneItem],
              }
            : {
                ...currentMonthObj,
                enhancements: [...(currentMonthObj.enhancements || []), tombstoneItem],
              };

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

      const updatedMonths = sortMonthsChronologically([...availableMonths, clean]);
      setAvailableMonths(updatedMonths);
      try {
        localStorage.setItem(AVAILABLE_MONTHS_KEY, JSON.stringify(updatedMonths));
      } catch (_) {}

      // Ensure newly added month is initialized and synced with the sorted months list
      setMonthlyStore((prev) => {
        const defaultAsOf = DEFAULT_AS_OF_BY_MONTH[clean] || `as of 15 ${clean.split(" ")[0]}`;
        const updated: MonthlyStore = {
          ...prev,
          [clean]: prev[clean] || {
            products: [],
            enhancements: [],
            asOfText: defaultAsOf,
          },
        };
        syncStore(updated, updatedMonths, clean);
        return updated;
      });

      setSelectedMonth(clean);
      try {
        sessionStorage.setItem(ACTIVE_MONTH_KEY, clean);
        localStorage.setItem(ACTIVE_MONTH_KEY, clean);
      } catch (_) {}
    },
    [availableMonths, syncStore]
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
    currentProductItems,
    currentEnhancementItems,
    getItemsForMonth,
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
