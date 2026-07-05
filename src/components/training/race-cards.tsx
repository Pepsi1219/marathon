"use client";

import { Trash2, Flag, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { daysBetween, formatShortDate, type WeekPlan } from "@/lib/training-plan";
import type { RaceGoalRecord } from "@/lib/firebase/training";

interface RaceCardsProps {
  races: RaceGoalRecord[];
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  today: Date;
  onRemove: (id: string) => Promise<void>;
}

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function RaceCards({ races, timeline, actualByWeek, today, onRemove }: RaceCardsProps) {
  const upcoming = races.filter((r) => parseLocal(r.date) >= today);
  if (upcoming.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {upcoming.map((race) => {
        const raceDate = parseLocal(race.date);
        const daysLeft = daysBetween(today, raceDate);
        const raceWeeks = timeline.filter((w) => w.targetRaceId === race.id);
        const totalPlanned = raceWeeks.reduce((s, w) => s + w.plannedKm, 0);
        const totalActual = raceWeeks.reduce((s, w) => s + (actualByWeek.get(w.weekKey) ?? 0), 0);
        const pct = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

        const distLabel =
          race.distanceKm >= 42 ? "Marathon" :
          race.distanceKm >= 21 ? "Half Marathon" :
          race.distanceKm >= 10 ? "10K" : `${race.distanceKm} km`;

        return (
          <Card key={race.id} className="border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Flag className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{race.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {formatShortDate(raceDate)}
                      </span>
                      <span>{distLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div className="text-xl font-bold tabular-nums leading-none text-primary">
                      {daysLeft}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">days left</div>
                  </div>
                  <button
                    onClick={() => onRemove(race.id)}
                    aria-label="Remove race"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Cumulative progress */}
              {raceWeeks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">Training progress</span>
                    <span className="font-medium tabular-nums">
                      {totalActual.toFixed(0)} / {totalPlanned.toFixed(0)} km
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
