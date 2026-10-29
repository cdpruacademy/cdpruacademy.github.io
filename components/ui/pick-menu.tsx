"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Icon } from "@/components/icon"

export interface PickOption {
  value: string
  label: string
  /** Small pill after the label, e.g. "This month" */
  note?: string
  /** Options with the same group are listed under that heading */
  group?: string
}

/**
 * The site's dropdown: the caller styles the trigger to fit where it sits
 * (red card, white page), and the list always opens as the same white rounded card.
 */
export function PickMenu({
  value,
  onChange,
  options,
  label,
  placeholder,
  className = "",
  align = "start",
}: {
  value?: string
  onChange: (value: string) => void
  options: PickOption[]
  /** Accessible name of the control */
  label: string
  placeholder?: string
  /** Classes for the trigger button */
  className?: string
  align?: "start" | "end"
}) {
  const current = options.find((o) => o.value === value)
  const groups: { name?: string; items: PickOption[] }[] = []
  for (const o of options) {
    const last = groups[groups.length - 1]
    if (last && last.name === o.group) last.items.push(o)
    else groups.push({ name: o.group, items: [o] })
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={`group inline-flex items-center justify-between gap-2 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder}>{current?.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon className="inline-flex">
          <Icon
            name="chevronDown"
            size={15}
            strokeWidth={2.4}
            className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          align={align}
          className="z-[80] max-h-[min(380px,var(--radix-select-content-available-height))] min-w-[max(220px,var(--radix-select-trigger-width))] overflow-hidden rounded-2xl bg-white p-1.5 text-ink shadow-[0_18px_44px_-14px_rgba(28,25,23,0.4)] ring-1 ring-black/5 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-ink-soft">
            <Icon name="chevronDown" size={14} className="rotate-180" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {groups.map((g, gi) => (
              <SelectPrimitive.Group key={g.name ?? `g${gi}`}>
                {g.name && (
                  <SelectPrimitive.Label className={`px-3 pb-1 text-[11px] font-bold tracking-[0.06em] text-ink-soft uppercase ${gi > 0 ? "mt-1.5 border-t border-surface pt-2.5" : "pt-1.5"}`}>
                    {g.name}
                  </SelectPrimitive.Label>
                )}
                {g.items.map((o) => (
                  <SelectPrimitive.Item
                    key={o.value}
                    value={o.value}
                    className="relative flex h-10 cursor-pointer items-center gap-2 rounded-xl pr-9 pl-3 text-sm outline-none select-none data-[highlighted]:bg-surface data-[state=checked]:bg-pru-red-soft data-[state=checked]:font-bold data-[state=checked]:text-brand-ink"
                  >
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    {o.note && (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">{o.note}</span>
                    )}
                    <SelectPrimitive.ItemIndicator className="absolute right-3">
                      <Icon name="check" size={15} strokeWidth={2.6} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-ink-soft">
            <Icon name="chevronDown" size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
