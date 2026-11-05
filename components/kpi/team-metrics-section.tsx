"use client"

import * as React from "react"
import { useMemo } from "react"
import { Icon } from "@/components/icon"
import { card } from "@/components/page-hero"
import { getLaunchPlanStats, getStepDurations, getYearProjects } from "@/lib/team-metrics"
import { MonthlyStore, getMonthsForYear } from "@/lib/timeline-data"

/** Back-office numbers for the whole year: launch dates kept, and days each step takes */
export function TeamMetricsSection({ store, year }: { store: MonthlyStore; year: number }) {
  const { launchPlan, stepDurations } = useMemo(() => {
    const items = getYearProjects(store, year).map((p) => p.item)
    return {
      launchPlan: getLaunchPlanStats(store, getMonthsForYear(year), items, "ALL_YEAR"),
      stepDurations: getStepDurations(items, "ALL_YEAR"),
    }
  }, [store, year])
  const maxStepDays = Math.max(1, ...stepDurations.steps.map((s) => s.avgDays))
  const kpiCard = `${card} flex flex-col gap-3 p-5`

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className={`${kpiCard} lg:col-span-4`}>
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="text-sm font-semibold text-ink-soft">Launch on plan</span>
            {launchPlan.tracked > 0 ? (
              <span className="block text-[44px] leading-tight font-bold">
                {Math.round((launchPlan.onPlan / launchPlan.tracked) * 100)}%
              </span>
            ) : (
              <span className="block py-3 text-sm text-ink-soft">No earlier plan yet</span>
            )}
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-done-soft text-done">
            <Icon name="launch" size={24} />
          </span>
        </div>
        {launchPlan.tracked > 0 && (
          <>
            <div className="flex h-2 gap-[3px] overflow-hidden rounded-full bg-surface">
              <span className="bg-done" style={{ flex: launchPlan.onPlan || 0.001 }} />
              <span className="bg-gray-300" style={{ flex: launchPlan.slipped || 0.001 }} />
            </div>
            <span className="text-xs text-ink-soft">
              {launchPlan.onPlan} of {launchPlan.tracked} on plan
              {launchPlan.slipped > 0 && ` · ${launchPlan.slipped} moved, avg +${launchPlan.avgSlipDays} days`}
            </span>
          </>
        )}
      </div>

      <div className={`${kpiCard} lg:col-span-8`}>
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="text-sm font-semibold text-ink-soft">Average days per step</span>
            <span className="block text-[13px] text-ink-soft">
              Kick-off → Launch{" "}
              <b className="text-base text-ink">
                {stepDurations.total.count > 0 ? `${stepDurations.total.avgDays} days` : "–"}
              </b>
            </span>
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface text-ink-soft">
            <Icon name="timeline" size={24} />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {stepDurations.steps.map((step) => (
            <div key={step.label} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-x-3 gap-y-1 sm:grid-cols-[230px_minmax(0,1fr)_70px]">
              <span className="truncate text-[13px]">{step.label}</span>
              <span className="order-last col-span-2 h-2 rounded-full bg-surface sm:order-none sm:col-span-1">
                <span
                  className="block h-2 rounded-full bg-ink-soft"
                  style={{ width: `${step.count > 0 ? (step.avgDays / maxStepDays) * 100 : 0}%` }}
                />
              </span>
              <b className="text-right text-sm">{step.count > 0 ? `${step.avgDays} d` : "–"}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
