import { Trophy } from "lucide-react";
import { formatDuration, formatPaceFromSec, formatShortDate } from "@/lib/training-plan";
import type { PersonalRecord } from "@/lib/dashboard-stats";

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface PersonalRecordsProps {
  records: PersonalRecord[];
}

export function PersonalRecords({ records }: PersonalRecordsProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Personal Records</h3>
        <p className="text-xs text-muted-foreground">
          Log a finish time on a past race to start tracking your personal bests.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Personal Records</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {records.map((r) => (
          <div key={r.category} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Trophy className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{r.category}</p>
              <p className="font-mono text-lg font-bold tabular-nums leading-tight">{formatDuration(r.finishTimeSec)}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {formatPaceFromSec(r.paceSecPerKm)}/km · {r.raceName} · {formatShortDate(parseLocal(r.date))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
