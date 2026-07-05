"use client";

import { PHASE_META, formatShortDate, type WeekPlan } from "@/lib/training-plan";

interface PlanChartProps {
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  currentWeekKey: string;
}

const VISIBLE_WEEKS = 12;

export function PlanChart({ timeline, actualByWeek, currentWeekKey }: PlanChartProps) {
  if (timeline.length === 0) return null;

  // Show current week ± context
  const currentIdx = timeline.findIndex((w) => w.weekKey === currentWeekKey);
  const startIdx = Math.max(0, currentIdx >= 0 ? currentIdx - 2 : 0);
  const weeks = timeline.slice(startIdx, startIdx + VISIBLE_WEEKS);

  const maxKm = Math.max(...weeks.map((w) => Math.max(w.plannedKm, actualByWeek.get(w.weekKey) ?? 0)), 1);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Weekly km</h3>

      {/* Chart */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end gap-1 pb-6" style={{ height: 120 }}>
          {weeks.map((week) => {
            const actual = actualByWeek.get(week.weekKey) ?? 0;
            const plannedH = Math.round((week.plannedKm / maxKm) * 90);
            const actualH = Math.round((actual / maxKm) * 90);
            const isCurrent = week.weekKey === currentWeekKey;
            const phase = PHASE_META[week.phase];

            return (
              <div key={week.weekKey} className="flex flex-col items-center gap-0.5" style={{ width: 36 }}>
                {/* Bars */}
                <div className="relative flex w-full items-end justify-center gap-0.5" style={{ height: 90 }}>
                  {/* Planned */}
                  <div
                    className={`w-3 rounded-t-sm transition-all ${phase.bg} ${isCurrent ? "ring-1 ring-primary/40" : ""}`}
                    style={{ height: plannedH || 2 }}
                    title={`Planned: ${week.plannedKm} km`}
                  />
                  {/* Actual */}
                  {actual > 0 && (
                    <div
                      className="w-3 rounded-t-sm bg-primary/70 transition-all"
                      style={{ height: actualH || 2 }}
                      title={`Actual: ${actual.toFixed(1)} km`}
                    />
                  )}
                </div>

                {/* X-axis label */}
                <span className={`whitespace-nowrap text-[9px] leading-none ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  {formatShortDate(week.weekStart).replace(" ", " ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-blue-500/20" />
          Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-primary/70" />
          Actual
        </span>
        {Object.entries(PHASE_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-sm ${meta.bg}`} />
            <span className={meta.text}>{meta.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
