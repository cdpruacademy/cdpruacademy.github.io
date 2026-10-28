import * as React from "react"

/** Buttons that sit on the red card */
export const heroButton =
  "touch-target inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-white/55 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/15 disabled:opacity-50"
export const heroButtonSolid =
  "touch-target inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold whitespace-nowrap text-brand-ink transition-colors hover:bg-white/90 disabled:opacity-50"

/** Buttons on white cards */
export const cardButton =
  "touch-target inline-flex h-10 items-center gap-2 rounded-full border border-rule bg-white px-4 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-surface disabled:opacity-50"
export const cardButtonDark =
  "touch-target inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-brand-hover disabled:opacity-50"

/** White card used on every page */
export const card = "rounded-[20px] bg-white shadow-[var(--shadow-card)]"

/**
 * The red card at the top of each page, under the white nav (the "Clean" look).
 * Pages put their title, numbers and controls in it, in white.
 */
export function PageHero({
  children,
  tone = "red",
}: {
  children: React.ReactNode
  /** "blue" is the Enhancement colour */
  tone?: "red" | "blue"
}) {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-5 sm:px-8 sm:pt-7">
      <section
        className={`rounded-[24px] px-5 py-6 text-white sm:px-8 sm:py-7 ${tone === "blue" ? "bg-enh" : "bg-pru-red"}`}
      >
        {children}
      </section>
    </div>
  )
}

export function PageBody({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1360px] px-4 pt-5 pb-12 sm:px-8 ${className}`}
    >
      {children}
    </div>
  )
}

/** Segmented control on the red card */
export function HeroSegment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-full bg-black/20 p-[3px]"
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`touch-target h-8 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${on ? "bg-white text-brand-ink" : "text-white hover:bg-white/10"}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
