export const DEFAULT_BROKER_COLORS: Record<string, string> = {
  ttb: "#009FE3",
  "ttb touch": "#009FE3",
  UOB: "#0B2265",
  Agency: "#ED1B2E",
  CIMB: "#7E1518",
  D2C: "#6366F1",
  "New Broker": "#334155",
  Audit: "#1E293B",
};

export const BROKER_COLORS_KEY = "pru_broker_colors_map_v1";

// Helper to resolve color case-insensitively with intelligent fallbacks
export function resolveBrokerColor(
  broker: string | undefined,
  colorMap: Record<string, string> = DEFAULT_BROKER_COLORS
): string {
  if (!broker) return "#334155";

  // 1. Direct match
  if (colorMap[broker]) return colorMap[broker];

  // 2. Case-insensitive key match
  const lower = broker.toLowerCase().trim();
  const matchedKey = Object.keys(colorMap || {}).find(
    (k) => k.toLowerCase().trim() === lower
  );
  if (matchedKey && colorMap[matchedKey]) return colorMap[matchedKey];

  // 3. Known brand substring fallbacks
  if (lower.includes("ttb")) return colorMap?.["ttb"] || colorMap?.["ttb touch"] || "#009FE3";
  if (lower.includes("uob")) return colorMap?.["UOB"] || "#0B2265";
  if (lower.includes("agency")) return colorMap?.["Agency"] || "#ED1B2E";
  if (lower.includes("cimb")) return colorMap?.["CIMB"] || "#7E1518";
  if (lower.includes("d2c")) return colorMap?.["D2C"] || "#6366F1";
  if (lower.includes("audit")) return colorMap?.["Audit"] || "#1E293B";
  if (lower.includes("new broker")) return colorMap?.["New Broker"] || "#334155";

  return "#334155";
}

// --- Contrast helpers: channel colors stay as stripes/dots, text uses a darkened ink ---
function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Same hue, darkened step by step until it reads at 4.5:1 on `background`. */
export function readableInk(color: string, background = "#FFFFFF"): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  let hex = color;
  for (let step = 0; step < 20 && contrast(hex, background) < 4.5; step++) {
    [r, g, b] = [r, g, b].map((v) => Math.round(v * 0.9));
    hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  return hex;
}
