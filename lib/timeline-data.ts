export type TimelineType = "product" | "enhancement";

export type BrokerTag = "ttb touch" | "New Broker" | "ttb" | "UOB" | "Agency" | "Audit" | string;

export type PhaseKey =
  | "kick-off"
  | "first-draft"
  | "first-draft-elearning"
  | "final-approval"
  | "final-elearning"
  | "internal-training"
  | "launch";

export interface PhaseDefinition {
  key: PhaseKey;
  label: string;
  badgeBg: string;
  badgeTextColor: string;
  hasAccentText?: boolean;
}

// Phase definitions for New Product (Red Accent)
export const PRODUCT_PHASES: PhaseDefinition[] = [
  {
    key: "kick-off",
    label: "Kick-off",
    badgeBg: "bg-[#5A646E]",
    badgeTextColor: "text-white",
  },
  {
    key: "first-draft",
    label: "First Draft",
    badgeBg: "bg-[#DDE9EF]",
    badgeTextColor: "text-[#2D2D2D]",
  },
  {
    key: "first-draft-elearning",
    label: "First Draft\ne-learning",
    badgeBg: "bg-[#DDE2E5]",
    badgeTextColor: "text-[#2D2D2D]",
  },
  {
    key: "final-approval",
    label: "Final Approval",
    badgeBg: "bg-[#D2E7ED]",
    badgeTextColor: "text-[#ED1C24]",
    hasAccentText: true,
  },
  {
    key: "final-elearning",
    label: "Final e-learning",
    badgeBg: "bg-[#DDE2E5]",
    badgeTextColor: "text-[#ED1C24]",
    hasAccentText: true,
  },
  {
    key: "internal-training",
    label: "Internal\nTraining Date",
    badgeBg: "bg-[#51C455]",
    badgeTextColor: "text-white",
  },
];

// Default PHASES alias
export const PHASES = PRODUCT_PHASES;

// Phase definitions for Enhancement (Blue Accent)
export const ENHANCEMENT_PHASES: PhaseDefinition[] = [
  {
    key: "kick-off",
    label: "Kick-off",
    badgeBg: "bg-[#5A646E]",
    badgeTextColor: "text-white",
  },
  {
    key: "first-draft",
    label: "First Draft",
    badgeBg: "bg-[#DDE9EF]",
    badgeTextColor: "text-[#2D2D2D]",
  },
  {
    key: "first-draft-elearning",
    label: "First Draft\ne-learning",
    badgeBg: "bg-[#DDE2E5]",
    badgeTextColor: "text-[#2D2D2D]",
  },
  {
    key: "final-approval",
    label: "Final Approval",
    badgeBg: "bg-[#D2E7ED]",
    badgeTextColor: "text-[#0066CC]",
    hasAccentText: true,
  },
  {
    key: "final-elearning",
    label: "Final e-learning",
    badgeBg: "bg-[#DDE2E5]",
    badgeTextColor: "text-[#0066CC]",
    hasAccentText: true,
  },
  {
    key: "internal-training",
    label: "Internal\nTraining Date",
    badgeBg: "bg-[#51C455]",
    badgeTextColor: "text-white",
  },
];

export type MilestoneStatus = "completed" | "in-progress" | "pending";

export interface MilestoneItem {
  phase: PhaseKey;
  date?: string;
  status: MilestoneStatus;
  isElearningIcon?: boolean;
}

export interface ProductItem {
  id: string;
  broker: BrokerTag;
  name: string;
  owner: string;
  milestones: Partial<Record<PhaseKey, MilestoneItem>>;
  internalDate?: string;
  commercialDate?: string;
  csDate?: string;
  customRightLabel?: string; // For things like "Sent out : 7 Aug 2026" or "Submission Date : Mid of Oct 2026"
  month?: string; // e.g. "AUG 2026"
  isCrossMonth?: boolean; // True if this item appears because target launch matches current selected month
  originalMonth?: string; // e.g. "AUG 2026" where it was originally created
}

// 1. Initial 9 New Products (Red theme)
export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: "pru-1",
    broker: "ttb touch",
    name: "ttb CI protect",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "11 Feb 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "19 May 2026", status: "completed", isElearningIcon: true },
      "final-approval": { phase: "final-approval", status: "pending" },
      "internal-training": { phase: "internal-training", status: "pending" },
    },
    internalDate: "TBC",
    commercialDate: "TBC",
    month: "AUG 2026",
  },
  {
    id: "pru-2",
    broker: "New Broker",
    name: "PRUInfinity 888 Ultra",
    owner: "Nitikan B.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "4 June 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "2 Jul 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "4 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "6 Aug 2026",
    commercialDate: "7 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-3",
    broker: "ttb",
    name: "ttb growth and protect &\nttb growth and protect booster",
    owner: "Nitikan B. / Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "8 July 2026", status: "completed", isElearningIcon: true },
      "first-draft": { phase: "first-draft", status: "pending" },
      "final-approval": { phase: "final-approval", status: "pending" },
      "internal-training": { phase: "internal-training", status: "pending" },
    },
    internalDate: "1 Oct 2026",
    commercialDate: "2 Oct 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-4",
    broker: "UOB",
    name: "UOB Pinnacle Principle Protect 5/14",
    owner: "Jirapat O.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "15 July 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "24 July 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "25 Aug 2026", status: "completed", isElearningIcon: true },
    },
    csDate: "CS: 27 Aug 2026",
    internalDate: "26 Aug 2026",
    commercialDate: "1 Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-5",
    broker: "New Broker",
    name: "PRUWhole Life Protect 99/20",
    owner: "Nitikan B.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "4 June 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "22 Jul 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "4 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "6 Aug 2026",
    commercialDate: "7 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-6",
    broker: "New Broker",
    name: "PRUwhole life 99/10",
    owner: "Nitikan B.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "6 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "17 Aug 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "24 Aug 2026", status: "completed" },
      "internal-training": { phase: "internal-training", date: "2 Sep 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "28 Aug 2026",
    commercialDate: "4 Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-7",
    broker: "New Broker",
    name: "PRUExclusive Legacy 99/3",
    owner: "Sakkarin S.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "6 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "14 Aug 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "25 Aug 2026", status: "completed" },
      "internal-training": { phase: "internal-training", date: "2 Sep 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "28 Aug 2026",
    commercialDate: "4 Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-8",
    broker: "New Broker",
    name: "PRUsmile 133",
    owner: "Sakkarin S.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "6 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "19 Jul 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "25 Aug 2026", status: "completed" },
      "internal-training": { phase: "internal-training", status: "completed", isElearningIcon: true },
    },
    internalDate: "28 Aug 2026",
    commercialDate: "4 Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "pru-9",
    broker: "New Broker",
    name: "ttb Rider and Endorsements",
    owner: "Jirapat O.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "6 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "27 Jul 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "5 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "6 Aug 2026",
    commercialDate: "7 Aug 2026",
    month: "AUG 2026",
  },
];

// 2. Initial 8 Enhancement Items (Blue theme - matching reference image)
export const INITIAL_ENHANCEMENTS: ProductItem[] = [
  {
    id: "enh-1",
    broker: "Agency",
    name: "Add New fund ILP",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "22 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "24 Jul 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "11 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "13 Aug 2026",
    commercialDate: "14 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-2",
    broker: "ttb",
    name: "Add 3 policy for ttb life shield",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "22 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "6 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "7 Aug 2026",
    commercialDate: "7 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-3",
    broker: "ttb",
    name: "ttb ultimate legacy 99/1 - Reduce Min SA",
    owner: "Nitikan B.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "27 Jul 2026", status: "completed" },
      "first-draft": { phase: "first-draft", date: "13 Aug 2026", status: "completed" },
      "final-approval": { phase: "final-approval", date: "18 Aug 2026", status: "completed", isElearningIcon: true },
    },
    internalDate: "21 Aug 2026",
    commercialDate: "21 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-4",
    broker: "ttb",
    name: "ttb all riders & Endorsements",
    owner: "Jirapat O.",
    milestones: {
      "kick-off": { phase: "kick-off", status: "completed", isElearningIcon: true },
    },
    customRightLabel: "Sent out : 7 Aug 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-5",
    broker: "ttb",
    name: "Change SME Loan Underwriting to GIO\nboth of business & personal",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "17 Jul 2026", status: "completed", isElearningIcon: true },
    },
    customRightLabel: "Sent out : Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-6",
    broker: "ttb",
    name: "acident one click for GIO index\nchange max from 10MB to 15MB",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "17 Jul 2026", status: "completed", isElearningIcon: true },
    },
    customRightLabel: "Sent out : Sep 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-7",
    broker: "ttb",
    name: "e-Smile Car cross-sell expansion to CYB",
    owner: "Surakit P.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "17 Jul 2026", status: "completed", isElearningIcon: true },
    },
    customRightLabel: "Sent out : Oct 2026",
    month: "AUG 2026",
  },
  {
    id: "enh-8",
    broker: "Audit",
    name: "Periodic Review 2026",
    owner: "Nitikan B.",
    milestones: {
      "kick-off": { phase: "kick-off", date: "8 Jun 2026", status: "completed", isElearningIcon: true },
      "final-approval": { phase: "final-approval", status: "pending" },
    },
    customRightLabel: "Submission Date : Mid of Oct 2026",
    month: "AUG 2026",
  },
];

export const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function getSystemCurrentMonth(): string {
  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();
  return `${month} ${year}`;
}

export function parseMonthYear(monthStr: string): { monthIndex: number; year: number } | null {
  if (!monthStr) return null;
  const parts = monthStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = MONTH_NAMES.indexOf(parts[0].toUpperCase());
  const year = parseInt(parts[1], 10);
  if (monthIdx === -1 || isNaN(year)) return null;
  return { monthIndex: monthIdx, year };
}

export function getMonthStatus(monthStr: string): "current" | "past" | "future" {
  const parsed = parseMonthYear(monthStr);
  if (!parsed) return "future";
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  if (parsed.year < currentYear) return "past";
  if (parsed.year > currentYear) return "future";
  if (parsed.monthIndex < currentMonthIdx) return "past";
  if (parsed.monthIndex > currentMonthIdx) return "future";
  return "current";
}

export const AVAILABLE_MONTHS = [
  "JUN 2026",
  "JUL 2026",
  "AUG 2026",
  "SEP 2026",
  "OCT 2026",
  "NOV 2026",
  "DEC 2026",
];

export interface MonthTimelineData {
  products: ProductItem[];
  enhancements: ProductItem[];
  asOfText: string;
}

export type MonthlyStore = Record<string, MonthTimelineData>;

export const DEFAULT_AS_OF_BY_MONTH: Record<string, string> = {
  "JUN 2026": "as of 30 Jun",
  "JUL 2026": "as of 31 Jul",
  "AUG 2026": "as of 31 Aug",
  "SEP 2026": "as of 15 Sep",
  "OCT 2026": "as of 15 Oct",
  "NOV 2026": "as of 15 Nov",
  "DEC 2026": "as of 15 Dec",
};

export const INITIAL_MONTHLY_STORE: MonthlyStore = {
  "AUG 2026": {
    products: INITIAL_PRODUCTS,
    enhancements: INITIAL_ENHANCEMENTS,
    asOfText: "as of 31 Aug",
  },
  "JUL 2026": {
    products: INITIAL_PRODUCTS.slice(0, 4).map((p, idx) => ({
      ...p,
      id: `jul-${p.id}`,
      month: "JUL 2026",
      internalDate: idx === 0 ? "10 Jul 2026" : p.internalDate,
    })),
    enhancements: INITIAL_ENHANCEMENTS.slice(0, 4).map((e) => ({
      ...e,
      id: `jul-${e.id}`,
      month: "JUL 2026",
    })),
    asOfText: "as of 31 Jul",
  },
  "SEP 2026": {
    products: INITIAL_PRODUCTS.map((p) => ({
      ...p,
      id: `sep-${p.id}`,
      month: "SEP 2026",
    })),
    enhancements: INITIAL_ENHANCEMENTS.map((e) => ({
      ...e,
      id: `sep-${e.id}`,
      month: "SEP 2026",
    })),
    asOfText: "as of 15 Sep",
  },
};
