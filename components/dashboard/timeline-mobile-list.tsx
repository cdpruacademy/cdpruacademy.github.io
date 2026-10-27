"use client"

import * as React from "react"
import { useState } from "react"
import { ProductItem, TimelineType } from "@/lib/timeline-data"
import { PruIcon } from "@/components/pru-icon"
import { formatShortDate, getProgress } from "./timeline-row"

interface TimelineMobileListProps {
  items: ProductItem[]
  timelineType: TimelineType
  isAdmin: boolean
  colorMap: Record<string, string>
  onEdit: (product: ProductItem) => void
  onPause: (product: ProductItem) => void
  onResume: (product: ProductItem) => void
  onDelete: (product: ProductItem) => void
}

/**
 * Phone layout of the timeline: one card per project with the progress line, where it stands
 * now and its launch date; tap to see every phase and the admin actions.
 * The 6-column grid stays for desktop and for the LINE images.
 */
export function TimelineMobileList({
  items,
  timelineType,
  isAdmin,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: TimelineMobileListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const actionButton =
    "touch-target flex-1 inline-flex items-center justify-center gap-1.5 h-11 border-2 border-rule bg-white text-sm font-bold text-ink"

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const { phases, used, current, isFinished } = getProgress(
          item,
          timelineType
        )
        const isOpen = openId === item.id
        const panelId = `mobile-steps-${item.id}`
        const state = (i: number) =>
          i === current
            ? "current"
            : current < 0 ||
                i < current ||
                item.milestones[phases[i].key]?.status === "completed"
              ? "done"
              : "todo"
        const currentPhase = current >= 0 ? phases[current] : null
        const launch = item.customRightLabel
          ? formatShortDate(item.customRightLabel)
          : formatShortDate(item.commercialDate) || "TBC"

        return (
          <li
            key={item.id}
            className={`border-2 border-rule bg-white ${item.isPaused ? "opacity-70" : ""}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full flex-col gap-2.5 p-4 text-left"
            >
              <span className="flex items-start justify-between gap-2 text-[13px] text-ink-soft">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <PruIcon
                    name="board"
                    size={13}
                    strokeWidth={4}
                    className="shrink-0"
                  />
                  <span className="truncate">
                    {item.broker} · {item.owner}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-bold text-ink">
                  <PruIcon
                    name="target"
                    size={14}
                    strokeWidth={4}
                    className="text-pru-red"
                  />
                  Launch {launch}
                </span>
              </span>

              <span className="text-[17px] leading-snug font-bold text-ink">
                {item.name.replace(/\n/g, " ")}
              </span>

              {used.length > 0 && (
                <span
                  className="flex items-center gap-[3px]"
                  aria-hidden="true"
                >
                  {used.map((i) => {
                    const st = state(i)
                    return (
                      <span
                        key={i}
                        className={`flex-1 rounded-full ${
                          st === "done"
                            ? "h-1 bg-pru-red"
                            : st === "current"
                              ? "h-2 border-2 border-pru-red bg-white"
                              : "h-1 bg-gray-300"
                        }`}
                      />
                    )
                  })}
                </span>
              )}

              <span className="flex items-center justify-between gap-2 text-[13px] text-ink">
                {item.isPaused ? (
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <PruIcon name="pause" size={15} strokeWidth={4} />
                    หยุดชั่วคราวตั้งแต่ {item.pausedSince}
                  </span>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <PruIcon name="check" size={15} strokeWidth={4} />
                    ครบทุกขั้นแล้ว
                  </span>
                ) : currentPhase ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <PruIcon
                      name="pin"
                      size={15}
                      strokeWidth={4}
                      className="shrink-0 text-pru-red"
                    />
                    <span className="truncate">
                      ตอนนี้: <b>{currentPhase.label.replace(/\n/g, " ")}</b>
                      {item.milestones[currentPhase.key]?.date
                        ? ` · ${formatShortDate(item.milestones[currentPhase.key]?.date)}`
                        : ""}
                    </span>
                  </span>
                ) : (
                  <span>รอ Target Launch</span>
                )}
                <span className="inline-flex shrink-0 items-center gap-1 text-ink-soft">
                  {isOpen ? "ซ่อนขั้นตอน" : "ดูทุกขั้น"}
                  <PruIcon
                    name="chevronDown"
                    size={14}
                    strokeWidth={4}
                    className={isOpen ? "rotate-180" : ""}
                  />
                </span>
              </span>
            </button>

            {isOpen && (
              <div
                id={panelId}
                className="flex flex-col gap-3 border-t-2 border-rule px-4 pt-3 pb-4"
              >
                <ol className="flex flex-col gap-2.5">
                  {used.map((i) => {
                    const st = state(i)
                    const phase = phases[i]
                    return (
                      <li
                        key={phase.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        {st === "current" ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[3px] border-pru-red bg-white">
                            <PruIcon
                              name="pin"
                              size={15}
                              strokeWidth={4}
                              className="text-pru-red"
                            />
                          </span>
                        ) : st === "done" ? (
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pru-red"
                          >
                            <PruIcon
                              name="check"
                              size={15}
                              strokeWidth={5}
                              className="text-white"
                            />
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-gray-400 bg-white text-xs font-bold text-ink-soft"
                          >
                            {i + 1}
                          </span>
                        )}
                        <span
                          className={`flex-1 ${st === "current" ? "font-bold text-ink" : st === "todo" ? "text-ink-soft" : "text-ink"}`}
                        >
                          {phase.label.replace(/\n/g, " ")}
                          <span className="sr-only">
                            {st === "done"
                              ? " (ผ่านแล้ว)"
                              : st === "current"
                                ? " (อัปเดตล่าสุด)"
                                : ""}
                          </span>
                        </span>
                        <span className="text-[13px] text-ink-soft">
                          {formatShortDate(item.milestones[phase.key]?.date) ||
                            "—"}
                        </span>
                      </li>
                    )
                  })}
                </ol>
                <div className="flex justify-between border-t-2 border-surface pt-2.5 text-[13px] text-ink-soft">
                  <span>
                    Internal {formatShortDate(item.internalDate) || "TBC"}
                  </span>
                  <span>
                    Commercial{" "}
                    <b className="text-ink">
                      {formatShortDate(item.commercialDate) || "TBC"}
                    </b>
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className={actionButton}
                    >
                      <PruIcon name="document" size={16} />
                      แก้ไข
                    </button>
                    {item.isPaused ? (
                      <button
                        type="button"
                        onClick={() => onResume(item)}
                        className={actionButton}
                      >
                        <PruIcon name="clock" size={16} />
                        ทำต่อ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPause(item)}
                        className={actionButton}
                      >
                        <PruIcon name="pause" size={16} />
                        หยุดชั่วคราว
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      aria-label="ลบถาวร"
                      className="inline-flex h-11 touch-target w-11 items-center justify-center border-2 border-rule bg-white text-ink-soft hover:text-brand-ink"
                    >
                      <PruIcon name="warning" size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
