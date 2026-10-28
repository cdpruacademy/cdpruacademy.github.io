import * as React from "react"

// Line icons for the style B screens: 24 viewBox, round caps, colour from `currentColor`
const PATHS = {
  kickoff: "M5 21V4M5 4h11l-2 4 2 4H5",
  draft:
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  elearning: "M3 5h18v11H3zM8 21h8M12 16v5M10.5 8.5v4l3.5-2z",
  approval:
    "M12 3l2.2 1.6 2.7-.1.8 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.8 2.6-2.7-.1L12 21l-2.2-1.6-2.7.1-.8-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.8-2.6 2.7.1zM8.5 12l2.5 2.5 4.5-5",
  finalElearning: "M4 5h16v10H4zM2 19h20M9 10l2 2 4-4",
  training: "M3 4h18M5 4v10h14V4M12 14v3M8 21l4-4 4 4",
  launch:
    "M5 15c-1.5 1-2 4-2 4s3-.5 4-2M9 15l-3-3 2-4c3-5 8-6 13-6 0 5-1 10-6 13l-4 2zM16 8.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0",
  check: "M5 12.5l4.5 4.5L19 7.5",
  completed: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M8 12.5l3 3 5-6",
  inProgress: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 7v5l3 2",
  onHold: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M10 9v6M14 9v6",
  folder:
    "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  partner:
    "M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8",
  user: "M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0M4 21c0-4 3.6-7 8-7s8 3 8 7",
  team: "M14 8a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0M3 20c0-3.5 3.1-6 7.5-6S18 16.5 18 20M16.5 4.6a3.5 3.5 0 0 1 0 6.8M21 20c0-2.8-1.5-4.8-4-5.6",
  calendar:
    "M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4",
  timeline:
    "M3 12h18M9 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0M19 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0",
  chart: "M4 20V11M10 20V5M16 20v-6M3 20h18",
  donut: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 3v9l6.4 6.4",
  megaphone: "M4 10v4h3l7 4V6L7 10zM18 9a4 4 0 0 1 0 6",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  send: "M21 3L10 14M21 3l-7 18-4-7-7-4z",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  close: "M6 6l12 12M18 6L6 18",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0",
  logout: "M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4M15 16l4-4-4-4M19 12H9",
  cloud: "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z",
  info: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 8v.01M12 11v5",
  warning: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 8v5M12 16h.01",
  external:
    "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  product: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  wrench:
    "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  search: "M18 11a7 7 0 1 1-14 0a7 7 0 1 1 14 0M20 20l-4-4",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
  /** Accessible name; without it the icon is decorative */
  label?: string
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  label,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** Icon for each timeline step, by phase key */
export const PHASE_ICONS: Record<string, IconName> = {
  "kick-off": "kickoff",
  "first-draft": "draft",
  "first-draft-elearning": "elearning",
  "final-approval": "approval",
  "final-elearning": "finalElearning",
  "internal-training": "training",
  launch: "launch",
}
