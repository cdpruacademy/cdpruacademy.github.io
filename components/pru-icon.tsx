import * as React from "react"

// Line icons from the PRU Academy IconSet: 48 viewBox, round caps, one colour, each with an opening.
// Colour comes from `currentColor`; pass a text-* class (or `color`) to tint.
const PATHS = {
  calendar: [
    "M36 10 H38 C40 10 41 11 41 13 V38 C41 40 40 41 38 41 H10 C8 41 7 40 7 38 V13 C7 11 8 10 10 10 H29",
    "M15 6 V14",
    "M33 6 V14",
    "M7 20 H41",
  ],
  megaphone: [
    "M20 16 L34 9 V39 L14 29 H9 C8 29 7 28 7 27 V21 C7 20 8 19 9 19 H14",
    "M14 29 L17 39 H22 L20 31",
    "M40 20 V28",
  ],
  chart: [
    "M8 8 V33",
    "M14 40 H40",
    "M14 32 L22 23 L29 28 L39 15",
    "M33 15 H39 V21",
  ],
  document: [
    "M28 6 H12 C10 6 9 7 9 9 V39 C9 41 10 42 12 42 H36 C38 42 39 41 39 39 V17 L32 10",
    "M28 6 V13 C28 15 29 17 31 17 H39",
    "M16 25 H32",
    "M16 32 H26",
  ],
  target: [
    "M24 6 A18 18 0 1 0 42 24",
    "M24 15 A9 9 0 1 0 33 24",
    "M24 24 L40 8",
    "M34 8 H40 V14",
  ],
  clock: ["M24 6 A18 18 0 1 0 40.5 16.7", "M24 14 V24 L31 29"],
  pause: ["M24 6 A18 18 0 1 0 40.5 16.7", "M20 18 V30", "M28 18 V30"],
  pin: [
    "M31 37 C28.5 39.7 26 42 24 42 C20 38 10 29 10 19 A14 14 0 0 1 38 19 C38 23 36.7 26.9 34.8 30.4",
    "M24 14 A5 5 0 1 0 29 19",
  ],
  person: [
    "M30.5 10 A8 8 0 1 0 31 17",
    "M9 42 C9 33 15.7 27 24 27 C32.3 27 39 33 39 42",
  ],
  family: [
    "M21.5 9.5 A6 6 0 1 0 22 13",
    "M5 40 C5 30 10 25 16 25 C20 25 23 27 25 30",
    "M37 18 A4.5 4.5 0 1 0 37.5 21",
    "M25 40 C25 33 28.5 29.5 33 29.5 C37.5 29.5 41 33 41 40",
  ],
  board: [
    "M6 9 H42",
    "M10 9 V30 H31",
    "M38 9 V24",
    "M24 30 V37",
    "M17 42 L24 37 L31 42",
    "M16 22 L21 17 L26 20 L32 15",
  ],
  star: [
    "M24 5 L29.5 17 L42 18.5 L32.5 27 L35.5 40 L24 33.5 L12.5 40 L15.5 27 L6 18.5 L18.5 17 L21.5 10.5",
  ],
  check: ["M9 25 L19 35 L39 13"],
  info: ["M24 6 A18 18 0 1 0 40.5 16.7", "M24 22 V33", "M24 15.5 V15.6"],
  warning: [
    "M34 41 H7 C5 41 4 39 5 37 L22 7 C23 5.3 25 5.3 26 7 L43 37 C43.6 38.2 43.4 39.5 42.5 40.3",
    "M24 18 V28",
    "M24 34 V34.1",
  ],
  lock: [
    "M16 21 V15 A8 8 0 0 1 32 15 V21",
    "M30 21 H38 V41 H10 V21 H23",
    "M24 29 V34",
  ],
  plus: ["M24 10 V38", "M10 24 H38"],
  send: ["M41 7 L7 20 L20 26", "M41 7 L28 41 L23 29", "M41 7 L26 22"],
  logout: [
    "M19 41 H11 C9 41 8 40 8 38 V10 C8 8 9 7 11 7 H19",
    "M32 34 L42 24 L32 14",
    "M42 24 H24",
  ],
  chevronLeft: ["M30 10 L16 24 L30 38"],
  chevronRight: ["M18 10 L32 24 L18 38"],
  chevronDown: ["M10 18 L24 32 L38 18"],
} as const

export type PruIconName = keyof typeof PATHS

interface PruIconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: PruIconName
  size?: number
  strokeWidth?: number
  /** Accessible name; without it the icon is decorative */
  label?: string
}

export function PruIcon({
  name,
  size = 20,
  strokeWidth = 3.5,
  label,
  ...rest
}: PruIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

/** The brand's "red line with an opening": two bars before a section label. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span aria-hidden="true" className="flex items-center gap-2">
        <span className="block h-[10px] w-[72px] rounded-full bg-pru-red" />
        <span className="block h-[10px] w-5 rounded-full bg-pru-red" />
      </span>
      <span className="text-sm font-bold tracking-[2px] text-ink uppercase">
        {children}
      </span>
    </div>
  )
}
