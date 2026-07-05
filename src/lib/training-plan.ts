// ── ISO week helpers ──────────────────────────────────────────────────────────

/** Returns "YYYY-Www" for any local date, using ISO 8601 week numbering. */
export function getISOWeekKey(date: Date): string {
  // The ISO year is the year of the Thursday in the date's week.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay() || 7; // 1=Mon … 7=Sun
  d.setDate(d.getDate() + 4 - dow); // shift to Thursday
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil((((d.getTime() - jan1.getTime()) / 86_400_000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Returns the Monday (week start) for a "YYYY-Www" key. */
export function getWeekStart(weekKey: string): Date {
  const [yearStr, wStr] = weekKey.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in ISO week 1.
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const w1Monday = new Date(jan4);
  w1Monday.setDate(jan4.getDate() - (dow - 1));
  const result = new Date(w1Monday);
  result.setDate(w1Monday.getDate() + (week - 1) * 7);
  return result;
}

/** Parses a "YYYY-MM-DD" string into a local midnight Date. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** All ISO-week Mondays from startDate's week through endDate's week, inclusive. */
function weeksInRange(startDate: Date, endDate: Date): Date[] {
  const result: Date[] = [];
  let cur = getWeekStart(getISOWeekKey(startDate));
  const end = getWeekStart(getISOWeekKey(endDate));
  while (cur.getTime() <= end.getTime()) {
    result.push(new Date(cur));
    cur = addDays(cur, 7);
  }
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrainingPhase = "build" | "taper" | "race" | "recovery";

export interface WeekPlan {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  /** System-generated km, before any manual override. */
  autoPlannedKm: number;
  /** Final km: override if set, otherwise autoPlannedKm. */
  plannedKm: number;
  isOverridden: boolean;
  phase: TrainingPhase;
  targetRaceId: string | null;
  targetRaceName: string | null;
  /** Weeks until target race; 0 = race week; null = recovery phase. */
  weeksToRace: number | null;
}

export interface RaceGoalInput {
  id: string;
  name: string;
  date: string;        // YYYY-MM-DD
  distanceKm: number;
  baseWeeklyKm: number;
}

export interface ActivityInput {
  date: string;        // YYYY-MM-DD
  distanceKm: number;
}

// ── Plan generation ───────────────────────────────────────────────────────────

/** Target peak weekly km, scaled by race distance from the user's current base. */
function computePeakKm(baseKm: number, distanceKm: number): number {
  const mult =
    distanceKm >= 42 ? 2.2 :
    distanceKm >= 21 ? 1.8 :
    distanceKm >= 10 ? 1.5 : 1.3;
  return Math.round(baseKm * mult);
}

interface SegmentEntry {
  weekKey: string;
  weekStart: Date;
  autoKm: number;
  phase: TrainingPhase;
  weeksToRace: number;
  targetRaceId: string;
  targetRaceName: string;
}

/**
 * Builds a training segment from segmentStart through raceDate (inclusive).
 *
 * Structure: build weeks → 2 taper weeks → race week.
 * Build: +10% per week, with a down week (75%) every 4th week.
 */
function buildSegment(
  segmentStart: Date,
  raceDate: Date,
  baseKm: number,
  peakKm: number,
  raceId: string,
  raceName: string,
): SegmentEntry[] {
  const weeks = weeksInRange(segmentStart, raceDate);
  const n = weeks.length;
  if (n === 0) return [];

  const taperCount = n >= 3 ? 2 : n >= 2 ? 1 : 0;
  const buildCount = n - taperCount - 1; // -1 for race week

  // Progressive build with every-4th-week recovery
  const buildKms: number[] = [];
  let runningPeak = baseKm;
  for (let i = 0; i < buildCount; i++) {
    if ((i + 1) % 4 === 0) {
      buildKms.push(Math.round(runningPeak * 0.75));
      // Don't advance runningPeak on down weeks — resume from same peak next week.
    } else {
      runningPeak = Math.min(runningPeak * 1.1, peakKm);
      buildKms.push(Math.round(runningPeak));
    }
  }

  const actualPeak = buildKms.length > 0 ? Math.max(...buildKms) : baseKm;
  const taperKms =
    taperCount === 2 ? [Math.round(actualPeak * 0.65), Math.round(actualPeak * 0.45)] :
    taperCount === 1 ? [Math.round(actualPeak * 0.65)] : [];

  const result: SegmentEntry[] = [];
  let wi = 0;

  for (let i = 0; i < buildCount; i++, wi++) {
    result.push({
      weekKey: getISOWeekKey(weeks[wi]),
      weekStart: weeks[wi],
      autoKm: buildKms[i],
      phase: "build",
      weeksToRace: n - 1 - wi,
      targetRaceId: raceId,
      targetRaceName: raceName,
    });
  }
  for (let i = 0; i < taperCount; i++, wi++) {
    result.push({
      weekKey: getISOWeekKey(weeks[wi]),
      weekStart: weeks[wi],
      autoKm: taperKms[i],
      phase: "taper",
      weeksToRace: n - 1 - wi,
      targetRaceId: raceId,
      targetRaceName: raceName,
    });
  }
  result.push({
    weekKey: getISOWeekKey(weeks[n - 1]),
    weekStart: weeks[n - 1],
    autoKm: Math.max(Math.round(baseKm * 0.4), 5),
    phase: "race",
    weeksToRace: 0,
    targetRaceId: raceId,
    targetRaceName: raceName,
  });

  return result;
}

/**
 * Generates the full multi-race training timeline.
 *
 * All races share one activity log. Between races the system inserts
 * 2 recovery weeks (50% → 70% of base) before rebuilding for the next event.
 * Manual overrides in `weeklyTargetOverrides` replace the auto-generated km
 * for any given week key without affecting the underlying auto plan.
 */
export function generateTimeline(
  races: RaceGoalInput[],
  today: Date,
  weeklyTargetOverrides: Map<string, number>,
): WeekPlan[] {
  const sorted = [...races]
    .filter((r) => parseLocalDate(r.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return [];

  const planMap = new Map<string, Omit<WeekPlan, "plannedKm" | "isOverridden">>();
  let segmentStart = getWeekStart(getISOWeekKey(today));
  const baseKm = sorted[0].baseWeeklyKm;

  for (let r = 0; r < sorted.length; r++) {
    const race = sorted[r];
    const raceDate = parseLocalDate(race.date);
    const peakKm = computePeakKm(baseKm, race.distanceKm);
    const entries = buildSegment(segmentStart, raceDate, baseKm, peakKm, race.id, race.name);

    for (const e of entries) {
      if (!planMap.has(e.weekKey)) {
        planMap.set(e.weekKey, {
          weekKey: e.weekKey,
          weekStart: e.weekStart,
          weekEnd: addDays(e.weekStart, 6),
          autoPlannedKm: e.autoKm,
          phase: e.phase,
          targetRaceId: e.targetRaceId,
          targetRaceName: e.targetRaceName,
          weeksToRace: e.weeksToRace,
        });
      }
    }

    // Recovery after this race (skip slots that would fall after the next race start)
    const nextRaceDate = r < sorted.length - 1 ? parseLocalDate(sorted[r + 1].date) : null;
    const recoverySlots: [number, number][] = [[1, 0.5], [2, 0.7]];
    for (const [weeksAfter, factor] of recoverySlots) {
      const recDate = addDays(raceDate, weeksAfter * 7);
      if (nextRaceDate && recDate >= nextRaceDate) continue;
      const recKey = getISOWeekKey(recDate);
      if (!planMap.has(recKey)) {
        const ws = getWeekStart(recKey);
        planMap.set(recKey, {
          weekKey: recKey,
          weekStart: ws,
          weekEnd: addDays(ws, 6),
          autoPlannedKm: Math.round(baseKm * factor),
          phase: "recovery",
          targetRaceId: nextRaceDate ? sorted[r + 1].id : null,
          targetRaceName: nextRaceDate ? sorted[r + 1].name : null,
          weeksToRace: null,
        });
      }
    }

    segmentStart = getWeekStart(getISOWeekKey(addDays(raceDate, 14)));
  }

  return Array.from(planMap.values())
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map((entry) => {
      const override = weeklyTargetOverrides.get(entry.weekKey);
      return {
        ...entry,
        plannedKm: override ?? entry.autoPlannedKm,
        isOverridden: override !== undefined,
      };
    });
}

// ── Activity aggregation ──────────────────────────────────────────────────────

/** Groups activity km by ISO week key. */
export function getActualByWeek(activities: ActivityInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of activities) {
    const key = getISOWeekKey(parseLocalDate(a.date));
    map.set(key, +(((map.get(key) ?? 0) + a.distanceKm).toFixed(2)));
  }
  return map;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Formats total seconds as "h:mm:ss" or "m:ss". */
export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Parses "h:mm:ss" or "m:ss" into total seconds.
 * Returns null on invalid input.
 */
export function parseDuration(str: string): number | null {
  const parts = str.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => isNaN(p) || p < 0)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/** Formats seconds-per-km as "m:ss". */
export function formatPaceFromSec(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Calendar days between two dates (positive when b > a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** "Nov 18" style label for a date. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Phase display metadata (label + Tailwind colour classes). */
export type PhaseInfo = { label: string; bg: string; text: string };

export const PHASE_META: Record<TrainingPhase, PhaseInfo> = {
  build:    { label: "Build",     bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-400" },
  taper:    { label: "Taper",     bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400" },
  race:     { label: "Race Week", bg: "bg-primary/10",     text: "text-primary" },
  recovery: { label: "Recovery",  bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
};
