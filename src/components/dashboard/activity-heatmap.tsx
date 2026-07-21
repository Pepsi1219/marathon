import type { HeatmapDay } from "@/lib/dashboard-stats";

interface ActivityHeatmapProps {
  weeks: HeatmapDay[][];
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function ActivityHeatmap({ weeks }: ActivityHeatmapProps) {
  // Month label appears on the first week-column where the month changes.
  const monthLabels = weeks.map((week, i) => {
    const first = week[0];
    if (i === 0) return first.date.toLocaleDateString("en", { month: "short" });
    const prevFirst = weeks[i - 1][0];
    return first.date.getMonth() !== prevFirst.date.getMonth()
      ? first.date.toLocaleDateString("en", { month: "short" })
      : "";
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Activity Calendar</h3>
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] pt-[18px]">
            {DAY_LABELS.map((label, i) => (
              <span key={i} className="flex h-[11px] items-center text-[8px] leading-none text-muted-foreground">
                {label}
              </span>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              <span className="block h-[14px] text-[9px] leading-none text-muted-foreground">{monthLabels[i]}</span>
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  className={`size-[11px] rounded-[3px] ${day.isFuture ? "bg-transparent" : LEVEL_CLASS[day.level]} ${
                    day.isToday ? "ring-1 ring-primary" : ""
                  }`}
                  title={day.isFuture ? undefined : `${day.dateStr}: ${day.km > 0 ? `${day.km} km` : "rest"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span key={level} className={`size-[10px] rounded-[2px] ${LEVEL_CLASS[level]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
