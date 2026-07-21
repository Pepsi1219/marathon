import Link from "next/link";
import { Flag, ChevronRight } from "lucide-react";
import { daysBetween, formatShortDate, parseLocalDate, distanceLabel, type WeekPlan } from "@/lib/training-plan";
import type { RaceGoalRecord } from "@/lib/firebase/training";

interface NextRaceCardProps {
  race: RaceGoalRecord;
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  today: Date;
}

export function NextRaceCard({ race, timeline, actualByWeek, today }: NextRaceCardProps) {
  const raceDate = parseLocalDate(race.date);
  const daysLeft = daysBetween(today, raceDate);
  const raceWeeks = timeline.filter((w) => w.targetRaceId === race.id);
  const totalPlanned = raceWeeks.reduce((s, w) => s + w.plannedKm, 0);
  const totalActual = raceWeeks.reduce((s, w) => s + (actualByWeek.get(w.weekKey) ?? 0), 0);
  const pct = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

  return (
    <Link
      href="/training"
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Flag className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{race.name}</p>
          <span className="font-mono text-lg font-bold tabular-nums leading-none text-primary">{daysLeft}d</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatShortDate(raceDate)} · {distanceLabel(race.distanceKm)}
        </p>
        {totalPlanned > 0 && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
