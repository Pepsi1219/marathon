"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/firebase/auth";
import {
  addRaceGoal, deleteRaceGoal, listRaceGoals, type RaceGoalRecord,
  addActivity, deleteActivity, listActivities, type ActivityRecord,
  setWeeklyTarget, deleteWeeklyTarget, listWeeklyTargets, type WeeklyTargetRecord,
} from "@/lib/firebase/training";
import {
  generateTimeline,
  getActualByWeek,
  getISOWeekKey,
  type WeekPlan,
  type RaceGoalInput,
  type ActivityInput,
} from "@/lib/training-plan";

export type { WeekPlan, RaceGoalRecord, ActivityRecord, WeeklyTargetRecord };

interface TrainingState {
  races: RaceGoalRecord[];
  activities: ActivityRecord[];
  targets: WeeklyTargetRecord[];
  loading: boolean;
}

export function useTraining() {
  const { user } = useAuthUser();
  const [state, setState] = useState<TrainingState>({
    races: [],
    activities: [],
    targets: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ races: [], activities: [], targets: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    Promise.all([
      listRaceGoals(user.uid),
      listActivities(user.uid),
      listWeeklyTargets(user.uid),
    ]).then(([races, activities, targets]) => {
      setState({ races, activities, targets, loading: false });
    }).catch(() => {
      setState((s) => ({ ...s, loading: false }));
    });
  }, [user]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const weeklyTargetOverrides = useMemo(
    () => new Map(state.targets.map((t) => [t.weekKey, t.plannedKm])),
    [state.targets],
  );

  const raceInputs = useMemo<RaceGoalInput[]>(
    () => state.races.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      distanceKm: r.distanceKm,
      baseWeeklyKm: r.baseWeeklyKm,
    })),
    [state.races],
  );

  const activityInputs = useMemo<ActivityInput[]>(
    () => state.activities.map((a) => ({ date: a.date, distanceKm: a.distanceKm })),
    [state.activities],
  );

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const timeline = useMemo(
    () => generateTimeline(raceInputs, today, weeklyTargetOverrides),
    [raceInputs, today, weeklyTargetOverrides],
  );

  const actualByWeek = useMemo(() => getActualByWeek(activityInputs), [activityInputs]);

  const currentWeekKey = useMemo(() => getISOWeekKey(today), [today]);
  const currentWeek = useMemo(
    () => timeline.find((w) => w.weekKey === currentWeekKey) ?? null,
    [timeline, currentWeekKey],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const addRace = useCallback(async (data: Omit<RaceGoalRecord, "id" | "createdAt">) => {
    if (!user) return;
    const record = await addRaceGoal(user.uid, data);
    setState((s) => ({
      ...s,
      races: [...s.races, record].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, [user]);

  const removeRace = useCallback(async (id: string) => {
    if (!user) return;
    await deleteRaceGoal(user.uid, id);
    setState((s) => ({ ...s, races: s.races.filter((r) => r.id !== id) }));
  }, [user]);

  const logActivity = useCallback(async (data: Omit<ActivityRecord, "id" | "createdAt">) => {
    if (!user) return;
    const record = await addActivity(user.uid, data);
    setState((s) => ({
      ...s,
      activities: [record, ...s.activities].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  }, [user]);

  const removeActivity = useCallback(async (id: string) => {
    if (!user) return;
    await deleteActivity(user.uid, id);
    setState((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }));
  }, [user]);

  const overrideWeekTarget = useCallback(async (weekKey: string, km: number) => {
    if (!user) return;
    await setWeeklyTarget(user.uid, weekKey, km);
    setState((s) => {
      const rest = s.targets.filter((t) => t.weekKey !== weekKey);
      return { ...s, targets: [...rest, { weekKey, plannedKm: km }] };
    });
  }, [user]);

  const clearWeekOverride = useCallback(async (weekKey: string) => {
    if (!user) return;
    await deleteWeeklyTarget(user.uid, weekKey);
    setState((s) => ({ ...s, targets: s.targets.filter((t) => t.weekKey !== weekKey) }));
  }, [user]);

  return {
    loading: state.loading,
    races: state.races,
    activities: state.activities,
    timeline,
    currentWeek,
    currentWeekKey,
    actualByWeek,
    today,
    addRace,
    removeRace,
    logActivity,
    removeActivity,
    overrideWeekTarget,
    clearWeekOverride,
  };
}
