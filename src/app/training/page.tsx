"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/lib/firebase/auth";
import { useTraining } from "@/hooks/use-training";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddRaceDialog } from "@/components/training/add-race-dialog";
import { WeekCard } from "@/components/training/week-card";
import { RaceCards } from "@/components/training/race-cards";
import { PlanChart } from "@/components/training/plan-chart";
import { ActivityLog } from "@/components/training/activity-log";

export default function TrainingPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [addRaceOpen, setAddRaceOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const {
    loading,
    races,
    activities,
    timeline,
    currentWeek,
    currentWeekKey,
    actualByWeek,
    today,
    addRace,
    updateRace,
    removeRace,
    logActivity,
    removeActivity,
    overrideWeekTarget,
    clearWeekOverride,
  } = useTraining();

  async function handleAddRace(data: Parameters<typeof addRace>[0]) {
    try {
      await addRace(data);
      toast.success("Race added!");
    } catch {
      toast.error("Failed to add race.");
      throw new Error("failed");
    }
  }

  async function handleUpdateRace(id: string, patch: { finishTime: number | null }) {
    try {
      await updateRace(id, patch);
    } catch {
      toast.error("Failed to save.");
    }
  }

  async function handleRemoveRace(id: string) {
    try {
      await removeRace(id);
      toast.success("Race removed.");
    } catch {
      toast.error("Failed to remove race.");
    }
  }

  async function handleLogActivity(data: Parameters<typeof logActivity>[0]) {
    try {
      await logActivity(data);
      toast.success("Activity logged!");
    } catch {
      toast.error("Failed to log activity.");
      throw new Error("failed");
    }
  }

  async function handleRemoveActivity(id: string) {
    try {
      await removeActivity(id);
      toast.success("Activity removed.");
    } catch {
      toast.error("Failed to remove activity.");
    }
  }

  if (authLoading) return null;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Training</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setAddRaceOpen(true)}>
            <Plus className="size-4" />
            Add Race
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : races.length === 0 ? (
          <EmptyState onAdd={() => setAddRaceOpen(true)} />
        ) : (
          <>
            {/* Current week */}
            {currentWeek && (
              <WeekCard
                week={currentWeek}
                actualKm={actualByWeek.get(currentWeekKey) ?? 0}
                onOverride={overrideWeekTarget}
                onClearOverride={clearWeekOverride}
              />
            )}

            {/* Upcoming races */}
            <RaceCards
              races={races}
              activities={activities}
              timeline={timeline}
              actualByWeek={actualByWeek}
              today={today}
              onRemove={handleRemoveRace}
              onUpdate={handleUpdateRace}
            />

            {/* Plan chart */}
            {timeline.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <PlanChart
                  timeline={timeline}
                  actualByWeek={actualByWeek}
                  currentWeekKey={currentWeekKey}
                />
              </div>
            )}

            {/* Activity log */}
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <ActivityLog
                activities={activities}
                onLog={handleLogActivity}
                onRemove={handleRemoveActivity}
              />
            </div>
          </>
        )}
      </div>

      <AddRaceDialog
        open={addRaceOpen}
        onOpenChange={setAddRaceOpen}
        defaultBaseWeeklyKm={races[0]?.baseWeeklyKm}
        onAdd={handleAddRace}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <TrendingUp className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">No race goals yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Add your first race to generate a personalized training plan with weekly targets.
        </p>
      </div>
      <Button size="sm" className="gap-1.5" onClick={onAdd}>
        <Plus className="size-4" />
        Add Race Goal
      </Button>
    </div>
  );
}
