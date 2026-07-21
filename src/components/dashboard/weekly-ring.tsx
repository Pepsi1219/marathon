import { Flame } from "lucide-react";
import { PHASE_META, daysBetween, formatShortDate, type WeekPlan } from "@/lib/training-plan";

interface WeeklyRingProps {
  week: WeekPlan | null;
  actualKm: number;
  today: Date;
  currentWeekStreak: number;
}

const SIZE = 136;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function WeeklyRing({ week, actualKm, today, currentWeekStreak }: WeeklyRingProps) {
  if (!week) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Add a race goal to see your weekly training ring.
      </div>
    );
  }

  const pct = week.plannedKm > 0 ? Math.min(actualKm / week.plannedKm, 1) : 0;
  const offset = CIRC * (1 - pct);
  const daysLeft = Math.max(daysBetween(today, week.weekEnd), 0);
  const phase = PHASE_META[week.phase];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-6">
      {/* Ring */}
      <div className="relative mx-auto shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-muted"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="stroke-primary transition-all duration-700 ease-out"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="font-mono text-2xl font-bold tabular-nums leading-none">{actualKm.toFixed(1)}</span>
          <span className="text-[11px] text-muted-foreground">of {week.plannedKm} km</span>
          <span className="font-mono text-xs font-semibold tabular-nums text-primary">{Math.round(pct * 100)}%</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">This Week</p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(week.weekStart)} – {formatShortDate(week.weekEnd)}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${phase.bg} ${phase.text}`}>
            {phase.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Days left</p>
            <p className="font-mono font-semibold tabular-nums">{daysLeft}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-mono font-semibold tabular-nums">{Math.max(week.plannedKm - actualKm, 0).toFixed(1)} km</p>
          </div>
          {currentWeekStreak > 0 && (
            <div>
              <p className="text-muted-foreground">Streak</p>
              <p className="flex items-center gap-1 font-mono font-semibold tabular-nums text-primary">
                <Flame className="size-3.5" />
                {currentWeekStreak}w
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
