// Pure TS aggregation helpers for the /dashboard page. Zero React/Firebase deps.

import {
  getISOWeekKey,
  getWeekStart,
  parseLocalDate,
  formatLocalDate,
  distanceLabel,
  addDays,
  daysBetween,
  getActualByWeek,
  type WeekPlan,
  type TrainingPhase,
} from "./training-plan";

export interface ActivityStatInput {
  date: string; // YYYY-MM-DD
  distanceKm: number;
  durationSec: number | null;
}

// ── Overall stats ────────────────────────────────────────────────────────────

export interface OverallStats {
  totalKm: number;
  totalRuns: number;
  totalDurationSec: number;
  avgPaceSecPerKm: number | null;
  longestRunKm: number;
  thisWeekKm: number;
  thisMonthKm: number;
  currentWeekStreak: number;
  bestWeekStreak: number;
}

function previousWeekKey(weekKey: string): string {
  return getISOWeekKey(addDays(getWeekStart(weekKey), -7));
}

function computeCurrentWeekStreak(weeksWithActivity: Set<string>, currentWeekKey: string): number {
  let cursor = weeksWithActivity.has(currentWeekKey) ? currentWeekKey : previousWeekKey(currentWeekKey);
  if (!weeksWithActivity.has(cursor)) return 0;
  let streak = 0;
  while (weeksWithActivity.has(cursor)) {
    streak++;
    cursor = previousWeekKey(cursor);
  }
  return streak;
}

function computeBestWeekStreak(weeksWithActivity: Set<string>): number {
  const keys = Array.from(weeksWithActivity).sort();
  let best = 0;
  let current = 0;
  let prevStart: Date | null = null;
  for (const key of keys) {
    const start = getWeekStart(key);
    current = prevStart && daysBetween(prevStart, start) === 7 ? current + 1 : 1;
    best = Math.max(best, current);
    prevStart = start;
  }
  return best;
}

export function computeOverallStats(activities: ActivityStatInput[], today: Date): OverallStats {
  const currentWeekKey = getISOWeekKey(today);
  const thisMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  let totalKm = 0;
  let totalDurationSec = 0;
  let kmWithDuration = 0;
  let longestRunKm = 0;
  let thisWeekKm = 0;
  let thisMonthKm = 0;
  const weeksWithActivity = new Set<string>();

  for (const a of activities) {
    totalKm += a.distanceKm;
    if (a.distanceKm > longestRunKm) longestRunKm = a.distanceKm;
    if (a.durationSec) {
      totalDurationSec += a.durationSec;
      kmWithDuration += a.distanceKm;
    }
    const weekKey = getISOWeekKey(parseLocalDate(a.date));
    weeksWithActivity.add(weekKey);
    if (weekKey === currentWeekKey) thisWeekKm += a.distanceKm;
    if (a.date.slice(0, 7) === thisMonthPrefix) thisMonthKm += a.distanceKm;
  }

  return {
    totalKm: +totalKm.toFixed(1),
    totalRuns: activities.length,
    totalDurationSec,
    avgPaceSecPerKm: kmWithDuration > 0 ? totalDurationSec / kmWithDuration : null,
    longestRunKm: +longestRunKm.toFixed(1),
    thisWeekKm: +thisWeekKm.toFixed(1),
    thisMonthKm: +thisMonthKm.toFixed(1),
    currentWeekStreak: computeCurrentWeekStreak(weeksWithActivity, currentWeekKey),
    bestWeekStreak: computeBestWeekStreak(weeksWithActivity),
  };
}

// ── Weekly volume trend (last N weeks, independent of any single race segment) ──

export interface WeeklyVolumePoint {
  weekKey: string;
  weekStart: Date;
  actualKm: number;
  plannedKm: number | null;
  phase: TrainingPhase | null;
  isCurrent: boolean;
}

export function computeWeeklyVolumeSeries(
  activities: ActivityStatInput[],
  timeline: WeekPlan[],
  today: Date,
  weeksBack = 8,
): WeeklyVolumePoint[] {
  const actualByWeek = getActualByWeek(activities);
  const planByWeek = new Map(timeline.map((w) => [w.weekKey, w]));
  const currentWeekKey = getISOWeekKey(today);
  const currentWeekStart = getWeekStart(currentWeekKey);

  const points: WeeklyVolumePoint[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = addDays(currentWeekStart, -7 * i);
    const key = getISOWeekKey(start);
    const plan = planByWeek.get(key);
    points.push({
      weekKey: key,
      weekStart: start,
      actualKm: actualByWeek.get(key) ?? 0,
      plannedKm: plan ? plan.plannedKm : null,
      phase: plan ? plan.phase : null,
      isCurrent: key === currentWeekKey,
    });
  }
  return points;
}

// ── Activity calendar heatmap ────────────────────────────────────────────────

export interface HeatmapDay {
  date: Date;
  dateStr: string;
  km: number;
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
  isToday: boolean;
}

/** Returns `weeksBack` columns of 7 days (Mon–Sun), ending on the current week. */
export function computeActivityHeatmap(
  activities: ActivityStatInput[],
  today: Date,
  weeksBack = 12,
): HeatmapDay[][] {
  const kmByDate = new Map<string, number>();
  for (const a of activities) {
    kmByDate.set(a.date, +(((kmByDate.get(a.date) ?? 0) + a.distanceKm).toFixed(2)));
  }

  const currentWeekStart = getWeekStart(getISOWeekKey(today));
  const gridStart = addDays(currentWeekStart, -7 * (weeksBack - 1));
  const todayStr = formatLocalDate(today);

  const nonZero = Array.from(kmByDate.values()).filter((v) => v > 0).sort((a, b) => a - b);
  const quantile = (p: number) =>
    nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] : 0;
  const t1 = quantile(0.25);
  const t2 = quantile(0.5);
  const t3 = quantile(0.75);

  // Check from the highest threshold down using `>=`. This matters when training volume is
  // consistent (e.g. always exactly 5km): with equal thresholds (t1 === t2 === t3), a `<=`
  // check from the bottom would always match the *first* (lightest) bucket, making every
  // single logged run render as the faintest color no matter how consistent the streak is.
  // `>=` from the top instead sends ties into the *highest* bucket, so a uniform daily
  // distance correctly renders as fully "hot" instead of collapsing to the lightest shade.
  function levelFor(km: number): 0 | 1 | 2 | 3 | 4 {
    if (km <= 0) return 0;
    if (km >= t3) return 4;
    if (km >= t2) return 3;
    if (km >= t1) return 2;
    return 1;
  }

  const weeks: HeatmapDay[][] = [];
  for (let w = 0; w < weeksBack; w++) {
    const weekStart = addDays(gridStart, w * 7);
    const days: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const dateStr = formatLocalDate(date);
      const isFuture = date > today;
      const km = isFuture ? 0 : kmByDate.get(dateStr) ?? 0;
      days.push({ date, dateStr, km, level: isFuture ? 0 : levelFor(km), isFuture, isToday: dateStr === todayStr });
    }
    weeks.push(days);
  }
  return weeks;
}

// ── Personal records ─────────────────────────────────────────────────────────

export interface PersonalRecord {
  category: string;
  km: number;
  raceName: string;
  date: string;
  finishTimeSec: number;
  paceSecPerKm: number;
}

const PR_CATEGORY_ORDER = ["5K", "10K", "Half Marathon", "Marathon", "Ultramarathon"];

/** Groups a race distance into one of the standard PR buckets, using `distanceLabel` as the
 * single source of truth for thresholds. Anything below the "10K" boundary (including custom
 * short distances) buckets into "5K" so every race lands in exactly one of the 5 categories. */
function prCategory(km: number): string {
  const label = distanceLabel(km);
  return PR_CATEGORY_ORDER.includes(label) ? label : "5K";
}

export function computePersonalRecords(
  races: { name: string; date: string; distanceKm: number; finishTime?: number | null }[],
): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const r of races) {
    if (!r.finishTime) continue;
    const category = prCategory(r.distanceKm);
    const existing = best.get(category);
    if (!existing || r.finishTime < existing.finishTimeSec) {
      best.set(category, {
        category,
        km: r.distanceKm,
        raceName: r.name,
        date: r.date,
        finishTimeSec: r.finishTime,
        paceSecPerKm: r.finishTime / r.distanceKm,
      });
    }
  }
  return Array.from(best.values()).sort(
    (a, b) => PR_CATEGORY_ORDER.indexOf(a.category) - PR_CATEGORY_ORDER.indexOf(b.category),
  );
}
