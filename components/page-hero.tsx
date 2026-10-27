import * as React from "react"

/** Buttons that sit on the red band */
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
 * The Prudential-red band at the top of every page. It continues the red nav bar,
 * and the page body (PageBody) overlaps its lower edge.
 */
export function PageHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-pru-red text-white">
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-4 pb-24 sm:px-8 sm:pt-6">
        {children}
      </div>
    </section>
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
      className={`mx-auto -mt-16 w-full max-w-[1360px] px-4 pb-12 sm:px-8 ${className}`}
    >
      {children}
    </div>
  )
}

/** Segmented control on the red band */
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
