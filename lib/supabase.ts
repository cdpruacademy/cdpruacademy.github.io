import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Partner } from "./partners";
import { MonthlyStore, getSystemCurrentMonth } from "./timeline-data";
import { mergeStores } from "./timeline-merge";
import { AnnouncementItem, filterWithinOneYear, mergeBotResults } from "./announcement-data";

/** Message from anything thrown: an Error, a Supabase error object or a string */
function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return typeof err === "string" && err ? err : fallback;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface CloudTimelinePayload {
  monthlyStore: MonthlyStore;
  availableMonths: string[];
  activeMonth?: string;
  updatedAt?: string;
}

const SUPABASE_CONFIG_KEY = "pru_supabase_config_v1";

export const DEFAULT_SUPABASE_URL = "https://bwevlsmrtbqbgsqjpppn.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_-o_L_yfoqNCpq4NnP1tiHQ_kFbmbiMF";

// Read configuration from LocalStorage or environment variables or defaults
export function getStoredSupabaseConfig(): SupabaseConfig | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return parsed;
        }
      }
    } catch (_) {}
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

export function saveStoredSupabaseConfig(config: SupabaseConfig | null) {
  if (typeof window === "undefined") return;
  if (!config || !config.url || !config.anonKey) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  }
}

let cachedClient: SupabaseClient | null = null;
let currentClientUrl = "";
let currentClientKey = "";

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config) return null;

  if (
    cachedClient &&
    currentClientUrl === config.url &&
    currentClientKey === config.anonKey
  ) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    currentClientUrl = config.url;
    currentClientKey = config.anonKey;
    adminCheckCache = null;
    return cachedClient;
  } catch (err) {
    console.error("Failed to initialize Supabase client", err);
    return null;
  }
}

// One shared team account (Supabase > Authentication > Users). Only the password is secret.
export const TEAM_ADMIN_EMAIL = "cdpruacademy@gmail.com";

const NOT_ADMIN_ERROR = "ต้องเข้าสู่ระบบ Admin ก่อนบันทึกข้อมูล";

// Admin check result cached per signed-in user so every hook instance shares one RPC call
let adminCheckCache: { userId: string; result: Promise<boolean> } | null = null;

/**
 * True when the current Supabase session belongs to an email listed in public.admin_users.
 * Writes are enforced by RLS on the server; this only drives the UI and skips doomed writes.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    adminCheckCache = null;
    return false;
  }

  if (!adminCheckCache || adminCheckCache.userId !== userId) {
    adminCheckCache = {
      userId,
      result: (async () => {
        const { data: isAdmin, error } = await client.rpc("is_admin");
        if (error) {
          console.warn("is_admin check failed:", error.message);
          return false;
        }
        return isAdmin === true;
      })(),
    };
  }
  return adminCheckCache.result;
}

export async function signInAdmin(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  const { error } = await client.auth.signInWithPassword({
    email: TEAM_ADMIN_EMAIL,
    password,
  });
  if (error) {
    return { success: false, error: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
  }

  adminCheckCache = null;
  if (!(await isCurrentUserAdmin())) {
    await client.auth.signOut();
    return { success: false, error: "บัญชีนี้ไม่มีสิทธิ์ Admin กรุณาติดต่อผู้ดูแลระบบ" };
  }
  return { success: true };
}

export async function signOutAdmin(): Promise<void> {
  const client = getSupabaseClient();
  adminCheckCache = null;
  if (client) await client.auth.signOut();
}

/**
 * Test connectivity with Supabase and check if table exists
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string; tableExists?: boolean }> {
  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await client
      .from("timeline_store")
      .select("id, updated_at")
      .eq("id", "current")
      .maybeSingle();

    if (error) {
      // Check if table missing
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return {
          success: true,
          tableExists: false,
          message: "เชื่อมต่อ Supabase สำเร็จ แต่ยังไม่พบตาราง timeline_store (กรุณารันคำสั่งสร้างตารางใน SQL Editor)",
        };
      }
      return {
        success: false,
        message: "เชื่อมต่อไม่สำเร็จ: " + error.message,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: "เชื่อมต่อฐานข้อมูล Supabase และพบตารางเรียบร้อยแล้ว!",
    };
  } catch (err) {
    return {
      success: false,
      message: "เกิดข้อผิดพลาด: " + (errorMessage(err, "ไม่สามารถติดต่อ Supabase ได้")),
    };
  }
}

/**
 * Fetch latest timeline store from Supabase Cloud DB
 */
export async function fetchTimelineFromCloud(): Promise<CloudTimelinePayload | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("timeline_store")
      .select("id, data, available_months, active_month, updated_at")
      .eq("id", "current")
      .maybeSingle();

    if (error) {
      console.warn("Cloud DB fetch error:", error.message);
      return null;
    }

    if (!data || !data.data) {
      return null;
    }

    // A save in flight owns these; its own conflict check picks up anything newer
    if (pendingSaves === 0) {
      knownTimelineVersion = data.updated_at || null;
      confirmedStore = data.data;
    }

    return {
      monthlyStore: data.data,
      availableMonths: Array.isArray(data.available_months) ? data.available_months : [],
      activeMonth: data.active_month || undefined,
      updatedAt: data.updated_at || undefined,
    };
  } catch (err) {
    console.warn("Cloud DB network fetch error:", err);
    return null;
  }
}

/**
 * Save timeline store to Supabase Cloud DB
 */
// Version (updated_at) of the timeline row this browser last loaded or saved.
// Saves only succeed when the row still has this version, so a stale tab cannot
// silently overwrite a newer save made somewhere else.
let knownTimelineVersion: string | null = null;
const ownTimelineVersions = new Set<string>();
let timelineSaveQueue: Promise<unknown> = Promise.resolve();
// What this tab last had from the server: the base of a merge when two saves collide
let confirmedStore: MonthlyStore | null = null;
let pendingSaves = 0;
// The latest merge in this tab. Saves queued before it finished are rebased onto its result.
let mergeGeneration = 0;
let lastMerge: { from: MonthlyStore; to: MonthlyStore } | null = null;

const MERGE_ATTEMPTS = 4;

const normalizeVersion = (v: string) => new Date(v).toISOString();

export const TIMELINE_CONFLICT_ERROR = "บันทึกไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุดแล้วแก้อีกครั้ง";

export type TimelineSaveResult = {
  success: boolean;
  conflict?: boolean;
  notAdmin?: boolean;
  error?: string;
  /** Set when other people's saves were merged in: what the server now holds */
  merged?: { monthlyStore: MonthlyStore; availableMonths: string[] };
};

export async function saveTimelineToCloud(payload: CloudTimelinePayload): Promise<TimelineSaveResult> {
  // Captured synchronously at call time: the version this change was based on.
  // The next save in this tab builds on this one, so the known version advances optimistically.
  const baseVersion = knownTimelineVersion;
  const newVersion = new Date().toISOString();
  knownTimelineVersion = newVersion;
  ownTimelineVersions.add(newVersion);
  const generation = mergeGeneration;
  pendingSaves += 1;

  const attempt = async (): Promise<TimelineSaveResult> => {
    const client = getSupabaseClient();
    if (!client) {
      knownTimelineVersion = baseVersion;
      return { success: false, error: "ไม่ได้กำหนดค่าการเชื่อมต่อ Cloud Database" };
    }

    if (!(await isCurrentUserAdmin())) {
      knownTimelineVersion = baseVersion;
      return { success: false, notAdmin: true, error: NOT_ADMIN_ERROR };
    }

    let store = payload.monthlyStore;
    let months = payload.availableMonths;
    let didMerge = false;
    if (generation !== mergeGeneration && lastMerge) {
      store = mergeStores(lastMerge.from, store, lastMerge.to);
      didMerge = true;
    }
    const mine = store;
    // Only becomes the new confirmed copy if this save lands; a failed one retries from the old base
    let base = confirmedStore;
    let expected = baseVersion;

    try {
      for (let i = 0; i < MERGE_ATTEMPTS; i++) {
        const row = {
          id: "current",
          data: store,
          available_months: months,
          active_month: payload.activeMonth || getSystemCurrentMonth(),
          updated_at: newVersion,
          updated_by: "pru_admin",
        };

        let collided = false;
        if (expected) {
          const { data, error } = await client
            .from("timeline_store")
            .update(row)
            .eq("id", "current")
            .eq("updated_at", expected)
            .select("updated_at");
          if (error) {
            console.error("Cloud DB save error:", error);
            return { success: false, error: error.message };
          }
          collided = !data || data.length === 0;
        } else {
          // Nothing loaded yet: only create the row, never replace an existing one
          const { error } = await client.from("timeline_store").insert(row);
          if (error && error.code !== "23505") {
            console.error("Cloud DB save error:", error);
            return { success: false, error: error.message };
          }
          collided = Boolean(error);
        }

        if (!collided) {
          confirmedStore = store;
          if (store !== mine) {
            // Published only now, so a save made during this merge still gets rebased
            lastMerge = { from: mine, to: store };
            mergeGeneration += 1;
          }
          return {
            success: true,
            merged: didMerge ? { monthlyStore: store, availableMonths: months } : undefined,
          };
        }

        // Someone saved first. Without a base there is nothing safe to merge.
        if (!base) break;
        const { data: latest, error: readError } = await client
          .from("timeline_store")
          .select("data, available_months, updated_at")
          .eq("id", "current")
          .maybeSingle();
        if (readError || !latest?.data) {
          return { success: false, error: readError?.message || "อ่านข้อมูลล่าสุดไม่สำเร็จ" };
        }

        store = mergeStores(base, store, latest.data);
        base = latest.data;
        months = Array.from(new Set([...months, ...(latest.available_months || [])]));
        expected = latest.updated_at;
        // Already included here: its realtime event must not put the screen back
        ownTimelineVersions.add(normalizeVersion(latest.updated_at));
        didMerge = true;
      }
      return { success: false, conflict: true, error: TIMELINE_CONFLICT_ERROR };
    } catch (err) {
      console.error("Cloud DB save exception:", err);
      return { success: false, error: errorMessage(err, "บันทึกข้อมูลไม่สำเร็จ") };
    }
  };

  const run = async () => {
    const res = await attempt();
    pendingSaves -= 1;
    // A later save still queued carries this merge forward and reports it
    if (res.merged && pendingSaves > 0) return { ...res, merged: undefined };
    return res;
  };

  const result = timelineSaveQueue.then(run, run);
  timelineSaveQueue = result;
  return result;
}

/** Latest timeline when the server has something this tab hasn't seen; null otherwise */
export async function fetchTimelineIfChanged(): Promise<CloudTimelinePayload | null> {
  const client = getSupabaseClient();
  if (!client || pendingSaves > 0) return null;
  const { data, error } = await client
    .from("timeline_store")
    .select("updated_at")
    .eq("id", "current")
    .maybeSingle();
  if (error || !data?.updated_at) return null;
  if (knownTimelineVersion && normalizeVersion(data.updated_at) === normalizeVersion(knownTimelineVersion)) {
    return null;
  }
  return fetchTimelineFromCloud();
}

let rowChannelCount = 0;

/** Calls back when a timeline_store row changes. RLS decides whether this user receives it. */
export function subscribeToStoreRow(id: string, onChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};
  rowChannelCount += 1;
  const channel = client
    .channel(`store_row_${id}_${rowChannelCount}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "timeline_store", filter: `id=eq.${id}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time changes on timeline_store table
 */
export function subscribeToTimelineCloud(
  onUpdate: (payload: CloudTimelinePayload) => void,
  onReconnect?: () => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel("timeline_realtime_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timeline_store",
          filter: "id=eq.current",
        },
        (change) => {
          type Update = Parameters<typeof onUpdate>[0];
          const row = change.new as {
            id?: string;
            data?: Update["monthlyStore"];
            available_months?: string[];
            active_month?: Update["activeMonth"];
            updated_at: string;
          };
          if (!row || row.id !== "current") return;
          // Echo of this tab's own save: nothing new to apply
          if (ownTimelineVersions.has(normalizeVersion(row.updated_at))) return;
          // A save in flight will collide with this one and merge it
          if (pendingSaves > 0) return;
          // Too big for a realtime message: the row arrives without its data
          if (!row.data) {
            onReconnect?.();
            return;
          }
          knownTimelineVersion = row.updated_at;
          confirmedStore = row.data;

          onUpdate({
            monthlyStore: row.data,
            availableMonths: Array.isArray(row.available_months) ? row.available_months : [],
            activeMonth: row.active_month,
            updatedAt: row.updated_at,
          });
        }
      )
      .subscribe((status) => {
        // Changes made while the connection was down never arrive as events
        if (status === "SUBSCRIBED") onReconnect?.();
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Could not subscribe to Supabase realtime:", err);
    return null;
  }
}

/**
 * Upload high-res timeline snapshot to Supabase Storage and register as latest_image
 */
export async function uploadTimelineSnapshot(
  dataUrl: string,
  month: string,
  timelineType: string,
  asOfText: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  if (!(await isCurrentUserAdmin())) {
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const safeMonth = month.replace(/\s+/g, "_").toLowerCase();
    const fileName = `${safeMonth}_${timelineType}_snapshot.png`;

    const { error: uploadError } = await client.storage
      .from("timeline-snapshots")
      .upload(fileName, byteArray, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = client.storage
      .from("timeline-snapshots")
      .getPublicUrl(fileName);

    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    // Register into timeline_store with id = 'latest_image'
    await client.from("timeline_store").upsert(
      {
        id: "latest_image",
        active_month: month,
        data: {
          image_url: publicUrl,
          file_name: fileName,
          timeline_type: timelineType,
          as_of_text: asOfText,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        updated_by: "pru_admin",
      },
      { onConflict: "id" }
    );

    return { success: true, publicUrl };
  } catch (err) {
    console.error("Snapshot upload exception:", err);
    return {
      success: false,
      error: errorMessage(err, "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ"),
    };
  }
}

/**
 * Upload both New Product and Enhancement snapshots to Supabase Storage
 * and update timeline_store row id = 'latest_image' with both URLs.
 * Uses overwrite/upsert with fixed filenames to avoid cluttering storage.
 */
export async function saveBothTimelineSnapshots(
  productDataUrl: string,
  enhancementDataUrl: string,
  month: string,
  asOfText: string,
  channelSummaryDataUrl?: string
): Promise<{
  success: boolean;
  productUrl?: string;
  enhancementUrl?: string;
  channelSummaryUrl?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  if (!(await isCurrentUserAdmin())) {
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  try {
    const toBytes = (dataUrl: string) => {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const byteChars = atob(base64Data);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      return new Uint8Array(byteNums);
    };

    const safeMonth = month.replace(/\s+/g, "_").toLowerCase();
    const productFileName = `${safeMonth}_product.png`;
    const enhancementFileName = `${safeMonth}_enhancement.png`;
    const channelSummaryFileName = `${safeMonth}_channel_summary.png`;

    // 1. Upload Product Image (overwrite)
    const { error: prodErr } = await client.storage
      .from("timeline-snapshots")
      .upload(productFileName, toBytes(productDataUrl), {
        contentType: "image/png",
        upsert: true,
      });
    if (prodErr) throw new Error("ไม่สามารถอัปโหลด New Product: " + prodErr.message);

    // 2. Upload Enhancement Image (overwrite)
    const { error: enhErr } = await client.storage
      .from("timeline-snapshots")
      .upload(enhancementFileName, toBytes(enhancementDataUrl), {
        contentType: "image/png",
        upsert: true,
      });
    if (enhErr) throw new Error("ไม่สามารถอัปโหลด Enhancement: " + enhErr.message);

    // 3. Upload Channel Summary Image (if provided)
    let channelSummaryUrl: string | undefined = undefined;
    if (channelSummaryDataUrl) {
      const { error: chErr } = await client.storage
        .from("timeline-snapshots")
        .upload(channelSummaryFileName, toBytes(channelSummaryDataUrl), {
          contentType: "image/png",
          upsert: true,
        });
      if (!chErr) {
        const { data: chUrlData } = client.storage
          .from("timeline-snapshots")
          .getPublicUrl(channelSummaryFileName);
        channelSummaryUrl = `${chUrlData.publicUrl}?t=${Date.now()}`;
      }
    }

    const { data: prodUrlData } = client.storage
      .from("timeline-snapshots")
      .getPublicUrl(productFileName);
    const { data: enhUrlData } = client.storage
      .from("timeline-snapshots")
      .getPublicUrl(enhancementFileName);

    const timestamp = Date.now();
    const productUrl = `${prodUrlData.publicUrl}?t=${timestamp}`;
    const enhancementUrl = `${enhUrlData.publicUrl}?t=${timestamp}`;

    // Preserving or getting channel summary url
    let finalChannelUrl = channelSummaryUrl;
    if (!finalChannelUrl) {
      try {
        const { data: existingChData } = client.storage
          .from("timeline-snapshots")
          .getPublicUrl(channelSummaryFileName);
        if (existingChData && existingChData.publicUrl) {
          finalChannelUrl = `${existingChData.publicUrl}?t=${timestamp}`;
        }
      } catch (_) {}
    }

    // Register into timeline_store with id = 'latest_image'
    await client.from("timeline_store").upsert(
      {
        id: "latest_image",
        active_month: month,
        data: {
          product_image_url: productUrl,
          enhancement_image_url: enhancementUrl,
          channel_summary_image_url: finalChannelUrl,
          image_url: productUrl, // backward compatibility
          month: month,
          as_of_text: asOfText,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        updated_by: "pru_admin",
      },
      { onConflict: "id" }
    );

    return {
      success: true,
      productUrl,
      enhancementUrl,
      channelSummaryUrl: finalChannelUrl,
    };
  } catch (err) {
    console.error("Save all snapshots exception:", err);
    return {
      success: false,
      error: errorMessage(err, "เกิดข้อผิดพลาดในการบันทึกรูปภาพ"),
    };
  }
}

/**
 * Uploads channel summary snapshot alone (useful when exporting from Analytics view)
 */
export async function updateChannelSummarySnapshot(
  channelSummaryDataUrl: string,
  periodText: string,
  asOfText: string
): Promise<{ success: boolean; channelSummaryUrl?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  if (!(await isCurrentUserAdmin())) {
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  try {
    const toBytes = (dataUrl: string) => {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const byteChars = atob(base64Data);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      return new Uint8Array(byteNums);
    };

    const fileName = "latest_channel_summary.png";

    // 1. Upload Channel Summary Image
    const { error: chErr } = await client.storage
      .from("timeline-snapshots")
      .upload(fileName, toBytes(channelSummaryDataUrl), {
        contentType: "image/png",
        upsert: true,
      });

    if (chErr) throw new Error("ไม่สามารถอัปโหลด Channel Summary: " + chErr.message);

    const { data: chUrlData } = client.storage
      .from("timeline-snapshots")
      .getPublicUrl(fileName);
    const channelSummaryUrl = `${chUrlData.publicUrl}?t=${Date.now()}`;

    // 2. Fetch existing latest_image record to preserve product & enhancement urls
    const { data: existingRows } = await client
      .from("timeline_store")
      .select("data")
      .eq("id", "latest_image")
      .limit(1);

    const existingData = existingRows && existingRows.length > 0 ? existingRows[0].data : {};

    // 3. Upsert into timeline_store
    await client.from("timeline_store").upsert(
      {
        id: "latest_image",
        active_month: periodText,
        data: {
          ...existingData,
          channel_summary_image_url: channelSummaryUrl,
          as_of_text: asOfText,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        updated_by: "pru_admin",
      },
      { onConflict: "id" }
    );

    return {
      success: true,
      channelSummaryUrl,
    };
  } catch (err) {
    console.error("Update channel summary snapshot error:", err);
    return {
      success: false,
      error: errorMessage(err, "เกิดข้อผิดพลาดในการบันทึกรูปภาพ"),
    };
  }
}


// Table setup + RLS policies live in supabase/migrations/ (admin-only writes).

/**
 * Fetch announcements from Supabase Cloud DB with strict 1-year retention filter
 */
export async function fetchAnnouncementsFromCloud(): Promise<AnnouncementItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("timeline_store")
      .select("id, data, updated_at")
      .eq("id", "announcements")
      .maybeSingle();

    if (error) {
      console.warn("Cloud DB announcements fetch error:", error.message);
      return null;
    }

    if (!data || !data.data || !Array.isArray(data.data.items)) {
      return null;
    }

    // Strictly enforce 1-year retention
    return filterWithinOneYear(data.data.items);
  } catch (err) {
    console.error("fetchAnnouncementsFromCloud exception:", err);
    return null;
  }
}

/**
 * Save announcements to Supabase Cloud DB with automatic 1-year pruning
 */
export async function saveAnnouncementsToCloud(
  items: AnnouncementItem[]
): Promise<{ success: boolean; items?: AnnouncementItem[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  if (!(await isCurrentUserAdmin())) {
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  try {
    // Keep send results the bot wrote since this page loaded, then prune anything older than 365 days
    const cloudItems = (await fetchAnnouncementsFromCloud()) || [];
    const pruned = filterWithinOneYear(mergeBotResults(items, cloudItems));

    const { error } = await client.from("timeline_store").upsert(
      {
        id: "announcements",
        data: {
          items: pruned,
          total_count: pruned.length,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        updated_by: "pru_admin",
      },
      { onConflict: "id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, items: pruned };
  } catch (err) {
    return { success: false, error: errorMessage(err, "เกิดข้อผิดพลาดในการบันทึกประกาศ") };
  }
}

/**
 * Upload an announcement image to Supabase Storage
 */
export async function uploadAnnouncementImage(
  file: File | Blob,
  fileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  }

  if (!(await isCurrentUserAdmin())) {
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  try {
    const safeName = fileName || `announcement_${Date.now()}.png`;
    const cleanFileName = `announcements/${Date.now()}_${safeName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: uploadError } = await client.storage
      .from("timeline-snapshots")
      .upload(cleanFileName, file, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = client.storage
      .from("timeline-snapshots")
      .getPublicUrl(cleanFileName);

    return {
      success: true,
      url: `${publicUrlData.publicUrl}?t=${Date.now()}`,
    };
  } catch (err) {
    return { success: false, error: errorMessage(err, "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ") };
  }
}


/**
 * Partners and their channels (row id "partners"). Everyone reads; only an admin saves.
 */
export async function fetchPartnersFromCloud(): Promise<Partner[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("timeline_store")
      .select("data")
      .eq("id", "partners")
      .maybeSingle();
    if (error || !data?.data || !Array.isArray(data.data.items)) return null;
    return data.data.items as Partner[];
  } catch (err) {
    console.warn("fetchPartnersFromCloud error:", err);
    return null;
  }
}

export async function savePartnersToCloud(
  items: Partner[]
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  if (!(await isCurrentUserAdmin())) return { success: false, error: NOT_ADMIN_ERROR };
  try {
    const now = new Date().toISOString();
    const { error } = await client.from("timeline_store").upsert(
      {
        id: "partners",
        data: { items, updated_at: now },
        updated_at: now,
        updated_by: "pru_admin",
      },
      { onConflict: "id" }
    );
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "บันทึก Partner ไม่สำเร็จ",
    };
  }
}

const TEAM_ROW_ID = "team_members";

export interface TeamStore {
  members: string[];
  colors: Record<string, string>;
}

/** The shared team list; only admins can read it, so everyone else keeps the built-in list */
export async function fetchTeamFromCloud(): Promise<TeamStore | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("timeline_store").select("data").eq("id", TEAM_ROW_ID).maybeSingle();
  if (error || !data?.data) return null;
  const raw = data.data as Partial<TeamStore>;
  if (!Array.isArray(raw.members) || raw.members.length === 0) return null;
  return { members: raw.members, colors: raw.colors && typeof raw.colors === "object" ? raw.colors : {} };
}

export async function saveTeamToCloud(team: TeamStore): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "ไม่ได้เชื่อมต่อ Supabase" };
  if (!(await isCurrentUserAdmin())) return { success: false, error: NOT_ADMIN_ERROR };
  const now = new Date().toISOString();
  const { error } = await client
    .from("timeline_store")
    .upsert({ id: TEAM_ROW_ID, data: team, updated_at: now, updated_by: "pru_admin" }, { onConflict: "id" });
  return error ? { success: false, error: error.message } : { success: true };
}
