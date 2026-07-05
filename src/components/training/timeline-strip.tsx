"use client";

import { useRef, useEffect } from "react";
import { PHASE_META, formatShortDate, type WeekPlan } from "@/lib/training-plan";

interface TimelineStripProps {
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  currentWeekKey: string;
}

export function TimelineStrip({ timeline, actualByWeek, currentWeekKey }: TimelineStripProps) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentRef.current && containerRef.current) {
      const container = containerRef.current;
      const chip = currentRef.current;
      const offset = chip.offsetLeft - container.clientWidth / 2 + chip.clientWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [currentWeekKey, timeline.length]);

  if (timeline.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Timeline</h3>
      <div
        ref={containerRef}
        className="flex gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {timeline.map((week) => {
          const isCurrent = week.weekKey === currentWeekKey;
          const actual = actualByWeek.get(week.weekKey) ?? 0;
          const done = actual >= week.plannedKm * 0.9;
          const phase = PHASE_META[week.phase];
          const label = formatShortDate(week.weekStart);

          return (
            <button
              key={week.weekKey}
              ref={isCurrent ? currentRef : undefined}
              title={`${week.weekKey} · ${phase.label} · ${week.plannedKm} km planned${actual > 0 ? ` · ${actual.toFixed(1)} km done` : ""}`}
              className={[
                "flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-center transition-colors",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : `${phase.bg} ${phase.text}`,
              ].join(" ")}
            >
              <span className="whitespace-nowrap text-[10px] font-medium leading-none">
                {label}
              </span>
              <span className={`text-[9px] leading-none ${isCurrent ? "text-primary-foreground/70" : "opacity-70"}`}>
                {week.plannedKm} km
              </span>
              {week.weeksToRace !== null && (
                <span className={`text-[9px] leading-none ${isCurrent ? "text-primary-foreground/60" : "opacity-50"}`}>
                  {week.weeksToRace === 0 ? "Race" : `−${week.weeksToRace}w`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
