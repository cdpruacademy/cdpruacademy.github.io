export const DEFAULT_BROKER_COLORS: Record<string, string> = {
  ttb: "#009FE3",
  "ttb touch": "#009FE3",
  UOB: "#0B2265",
  Agency: "#ED1C24",
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
  if (lower.includes("agency")) return colorMap?.["Agency"] || "#ED1C24";
  if (lower.includes("cimb")) return colorMap?.["CIMB"] || "#7E1518";
  if (lower.includes("d2c")) return colorMap?.["D2C"] || "#6366F1";
  if (lower.includes("audit")) return colorMap?.["Audit"] || "#1E293B";
  if (lower.includes("new broker")) return colorMap?.["New Broker"] || "#334155";

  return "#334155";
}
