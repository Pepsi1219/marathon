/** Pace stored as seconds-per-km, always an integer — avoids floating point drift on min:sec math. */
export type PaceSeconds = number;

export interface KmSegment {
  /** Segment order: 1..N, plus a final fractional segment when totalKm has a remainder. */
  index: number;
  /** Distance covered by this segment (km) — usually 1, the last segment may be a remainder. */
  distanceKm: number;
  /** null = use the race's default pace; a number = this segment has been overridden by the user. */
  overridePace: PaceSeconds | null;
  hasWater: boolean;
  hasGel: boolean;
  note?: string;
}

export interface ComputedSplit extends KmSegment {
  effectivePace: PaceSeconds;
  segmentSeconds: number;
  cumulativeSeconds: number;
  clockTime: string;
  cumulativeDistanceKm: number;
}

export interface RaceConfig {
  /** "HH:mm", 24h clock */
  startTime: string;
  totalDistanceKm: number;
  defaultPace: PaceSeconds;
}

export const MIN_PACE_SECONDS = 120;
export const MAX_PACE_SECONDS = 900;

export const STANDARD_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half Marathon", km: 21.0975 },
  { label: "Marathon", km: 42.195 },
  { label: "Ultramarathon 100K", km: 100 },
] as const;

/** Builds segments for a race distance: full km segments plus one fractional segment if needed. */
export function buildSegments(
  totalKm: number,
  options?: { waterEveryKm?: number; gelEveryKm?: number },
): KmSegment[] {
  const waterEveryKm = options?.waterEveryKm ?? 2;
  const gelEveryKm = options?.gelEveryKm ?? 7;

  const fullKms = Math.floor(totalKm);
  const remainder = +(totalKm - fullKms).toFixed(3);
  const segments: KmSegment[] = [];

  for (let i = 1; i <= fullKms; i++) {
    segments.push({
      index: i,
      distanceKm: 1,
      overridePace: null,
      hasWater: waterEveryKm > 0 && i % waterEveryKm === 0,
      hasGel: gelEveryKm > 0 && i % gelEveryKm === 0,
    });
  }
  if (remainder > 0) {
    segments.push({
      index: fullKms + 1,
      distanceKm: remainder,
      overridePace: null,
      hasWater: false,
      hasGel: false,
    });
  }
  return segments;
}

/**
 * Computes cumulative splits for the whole race in one O(n) pass.
 * Call this again with the updated segments any time a pace override changes —
 * recalculating ~43 rows is cheap enough that no incremental/memoized diffing is needed.
 */
export function computeSplits(config: RaceConfig, segments: KmSegment[]): ComputedSplit[] {
  const startSeconds = parseClockToSeconds(config.startTime);

  let cumulative = 0;
  let cumDistance = 0;

  return segments.map((seg) => {
    const pace = seg.overridePace ?? config.defaultPace;
    const segmentSeconds = pace * seg.distanceKm;
    cumulative += segmentSeconds;
    cumDistance += seg.distanceKm;

    return {
      ...seg,
      effectivePace: pace,
      segmentSeconds,
      cumulativeSeconds: cumulative,
      cumulativeDistanceKm: +cumDistance.toFixed(3),
      clockTime: secondsToClock(startSeconds + cumulative),
    };
  });
}

export interface RaceSummary {
  finishClockTime: string;
  totalDuration: string;
  averagePace: string;
}

/** Data for the sticky summary bar. */
export function summarize(config: RaceConfig, splits: ComputedSplit[]): RaceSummary {
  const last = splits[splits.length - 1];
  const totalSeconds = last?.cumulativeSeconds ?? 0;
  return {
    finishClockTime: last?.clockTime ?? "--:--",
    totalDuration: secondsToHms(totalSeconds),
    averagePace: config.totalDistanceKm > 0 ? formatPace(totalSeconds / config.totalDistanceKm) : "0:00",
  };
}

// ---------- formatting helpers ----------

export function parseClockToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

/** Wraps past midnight (e.g. race starting late at night finishing next day). */
export function secondsToClock(totalSeconds: number): string {
  const s = Math.round(totalSeconds) % 86400;
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

export function secondsToHms(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** 360 -> "6:00" (min/km) */
export function formatPace(pace: PaceSeconds): string {
  const rounded = Math.round(pace);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

/** "5:30" -> 330. Returns null for unparseable input. */
export function parsePace(text: string): PaceSeconds | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Adjusts pace by +/- deltaSeconds, clamped to a sane range. */
export function adjustPace(current: PaceSeconds, deltaSeconds: number): PaceSeconds {
  return Math.min(MAX_PACE_SECONDS, Math.max(MIN_PACE_SECONDS, current + deltaSeconds));
}
