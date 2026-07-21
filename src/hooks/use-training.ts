"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/firebase/auth";
import {
  addRaceGoal, updateRaceGoal, deleteRaceGoal, listRaceGoals, type RaceGoalRecord,
  addActivity, deleteActivity, listActivities, type ActivityRecord,
  setWeeklyTarget, deleteWeeklyTarget, listWeeklyTargets, type WeeklyTargetRecord,
} from "@/lib/firebase/training";
import {
  generateTimeline,
  getActualByWeek,
  getISOWeekKey,
  parseLocalDate,
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
  /** True when the last Firestore load attempt failed — distinct from "loaded, and genuinely
   * empty". Without this, a network error looks identical to a brand-new account with no
   * races, which reads as "my data got deleted" rather than "reload and try again". */
  error: boolean;
}

export function useTraining() {
  const { user } = useAuthUser();
  const [state, setState] = useState<TrainingState>({
    races: [],
    activities: [],
    targets: [],
    loading: true,
    error: false,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setState({ races: [], activities: [], targets: [], loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: false }));
    Promise.all([
      listRaceGoals(user.uid),
      listActivities(user.uid),
      listWeeklyTargets(user.uid),
    ]).then(([races, activities, targets]) => {
      setState({ races, activities, targets, loading: false, error: false });
    }).catch(() => {
      setState((s) => ({ ...s, loading: false, error: true }));
    });
  }, [user, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

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

  // Anchor the plan to the date the *current* first upcoming race was added, so the chart
  // advances week by week instead of resetting to "today" on every load. Scoped to only the
  // race generateTimeline treats as its first segment (upcoming, earliest date) — NOT the
  // earliest createdAt across all races ever added. Using all races would let a long-finished
  // past race (added months/years ago) anchor a brand-new plan to that ancient date, silently
  // regenerating months of phantom historical weeks. Same reasoning applies when the current
  // first race is deleted: the next race in line anchors from its own createdAt, not some
  // unrelated older race's.
  const planStartDate = useMemo(() => {
    const upcoming = state.races
      .filter((r) => parseLocalDate(r.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const ts = upcoming[0]?.createdAt;
    return ts && typeof (ts as { toDate?: unknown }).toDate === "function"
      ? (ts as { toDate(): Date }).toDate()
      : undefined;
  }, [state.races, today]);

  const timeline = useMemo(
    () => generateTimeline(raceInputs, today, weeklyTargetOverrides, planStartDate),
    [raceInputs, today, weeklyTargetOverrides, planStartDate],
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

  const updateRace = useCallback(async (id: string, patch: { finishTime: number | null }) => {
    if (!user) return;
    await updateRaceGoal(user.uid, id, patch);
    setState((s) => ({
      ...s,
      races: s.races.map((r) => r.id === id ? { ...r, ...patch } : r),
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
    error: state.error,
    retry,
    races: state.races,
    activities: state.activities,
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
  };
}
