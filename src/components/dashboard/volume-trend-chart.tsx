import { formatShortDate } from "@/lib/training-plan";
import type { WeeklyVolumePoint } from "@/lib/dashboard-stats";

interface VolumeTrendChartProps {
  points: WeeklyVolumePoint[];
}

const CHART_H = 100;

export function VolumeTrendChart({ points }: VolumeTrendChartProps) {
  const maxVal = Math.max(...points.map((p) => Math.max(p.actualKm, p.plannedKm ?? 0)), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Training Volume</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-primary" />
            Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-px w-2.5 border-t border-dashed border-foreground/40" />
            Target
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2 sm:gap-3" style={{ height: CHART_H + 28 }}>
        {points.map((p) => {
          const actualH = Math.round((p.actualKm / maxVal) * CHART_H);
          const goalH = p.plannedKm != null ? Math.round((p.plannedKm / maxVal) * CHART_H) : null;
          const metGoal = p.plannedKm != null && p.actualKm >= p.plannedKm && p.plannedKm > 0;

          return (
            <div key={p.weekKey} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex w-full items-end justify-center" style={{ height: CHART_H }}>
                {goalH !== null && goalH > 0 && (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-foreground/30"
                    style={{ bottom: goalH }}
                  />
                )}
                <div
                  className={`w-full max-w-6 rounded-t-sm transition-all ${
                    metGoal ? "bg-primary" : "bg-primary/50"
                  } ${p.isCurrent ? "ring-1 ring-primary/50 ring-offset-1 ring-offset-card" : ""}`}
                  style={{ height: actualH || (p.actualKm > 0 ? 2 : 0) }}
                  title={`${p.actualKm.toFixed(1)} km${p.plannedKm != null ? ` / ${p.plannedKm} km target` : ""}`}
                />
              </div>
              <span className={`text-[9px] leading-none ${p.isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                {formatShortDate(p.weekStart)}
              </span>
              <span className="font-mono text-[9px] leading-none tabular-nums text-muted-foreground">
                {p.actualKm > 0 ? p.actualKm.toFixed(0) : "–"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
