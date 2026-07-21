"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, TrendingUp, Route, Timer, Gauge, Award, LayoutDashboard } from "lucide-react";
import { useAuthUser } from "@/lib/firebase/auth";
import { useTraining } from "@/hooks/use-training";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/dashboard/stat-tile";
import { WeeklyRing } from "@/components/dashboard/weekly-ring";
import { VolumeTrendChart } from "@/components/dashboard/volume-trend-chart";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { PersonalRecords } from "@/components/dashboard/personal-records";
import { NextRaceCard } from "@/components/dashboard/next-race-card";
import {
  computeOverallStats,
  computeWeeklyVolumeSeries,
  computeActivityHeatmap,
  computePersonalRecords,
  type ActivityStatInput,
} from "@/lib/dashboard-stats";
import { formatDuration, formatPaceFromSec } from "@/lib/training-plan";

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const { loading, races, activities, timeline, currentWeek, currentWeekKey, actualByWeek, today } = useTraining();

  const activityInputs = useMemo<ActivityStatInput[]>(
    () => activities.map((a) => ({ date: a.date, distanceKm: a.distanceKm, durationSec: a.durationSec })),
    [activities],
  );

  const stats = useMemo(() => computeOverallStats(activityInputs, today), [activityInputs, today]);
  const volumePoints = useMemo(
    () => computeWeeklyVolumeSeries(activityInputs, timeline, today, 8),
    [activityInputs, timeline, today],
  );
  const heatmapWeeks = useMemo(() => computeActivityHeatmap(activityInputs, today, 12), [activityInputs, today]);
  const personalRecords = useMemo(() => computePersonalRecords(races), [races]);

  const nextRace = useMemo(() => {
    const upcoming = races.filter((r) => parseLocal(r.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] ?? null;
  }, [races, today]);

  const hasData = races.length > 0 || activities.length > 0;

  if (authLoading) return null;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Your training at a glance</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Weekly progress ring */}
            <WeeklyRing
              week={currentWeek}
              actualKm={actualByWeek.get(currentWeekKey) ?? 0}
              today={today}
              currentWeekStreak={stats.currentWeekStreak}
            />

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatTile icon={Calendar} label="This month" value={stats.thisMonthKm.toFixed(0)} unit="km" accent />
              <StatTile icon={Route} label="Total distance" value={stats.totalKm.toFixed(0)} unit="km" />
              <StatTile icon={TrendingUp} label="Total runs" value={String(stats.totalRuns)} />
              <StatTile icon={Timer} label="Longest run" value={stats.longestRunKm.toFixed(1)} unit="km" />
              <StatTile
                icon={Gauge}
                label="Avg pace"
                value={stats.avgPaceSecPerKm ? formatPaceFromSec(stats.avgPaceSecPerKm) : "–"}
                unit={stats.avgPaceSecPerKm ? "/km" : undefined}
              />
              <StatTile icon={Award} label="Best streak" value={String(stats.bestWeekStreak)} unit="wk" />
            </div>

            {/* Next race */}
            {nextRace && (
              <NextRaceCard race={nextRace} timeline={timeline} actualByWeek={actualByWeek} today={today} />
            )}

            {/* Training volume */}
            {volumePoints.some((p) => p.actualKm > 0 || p.plannedKm) && (
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <VolumeTrendChart points={volumePoints} />
              </div>
            )}

            {/* Activity calendar */}
            {activities.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <ActivityHeatmap weeks={heatmapWeeks} />
              </div>
            )}

            {/* Personal records */}
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <PersonalRecords records={personalRecords} />
            </div>

            {stats.totalDurationSec > 0 && (
              <p className="text-center text-[11px] text-muted-foreground">
                Total time trained: <span className="font-mono tabular-nums">{formatDuration(stats.totalDurationSec)}</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LayoutDashboard className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Nothing to show yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Add a race goal and log a few runs on the Training page to see your stats here.
        </p>
      </div>
    </div>
  );
}
