import { describe, expect, it } from "vitest";
import {
  getISOWeekKey,
  getWeekStart,
  parseLocalDate,
  formatLocalDate,
  distanceLabel,
  generateTimeline,
  getActualByWeek,
  type RaceGoalInput,
} from "./training-plan";

describe("formatLocalDate", () => {
  it("round-trips through parseLocalDate without a UTC-shift off-by-one", () => {
    const date = new Date(2026, 5, 10); // 2026-06-10, local midnight
    expect(formatLocalDate(date)).toBe("2026-06-10");
    expect(parseLocalDate(formatLocalDate(date)).getTime()).toBe(date.getTime());
  });

  it("never shifts to a different day the way toISOString() would for UTC+ zones", () => {
    // A date constructed from local components must format back to the same local calendar
    // day regardless of the runtime's timezone offset — this is the exact bug class that hit
    // `new Date().toISOString().slice(0, 10)` for users east of UTC in the early-morning hours.
    for (let day = 1; day <= 28; day++) {
      const date = new Date(2026, 0, day);
      expect(formatLocalDate(date)).toBe(`2026-01-${String(day).padStart(2, "0")}`);
    }
  });
});

describe("getISOWeekKey / getWeekStart", () => {
  it("round-trips: getWeekStart(getISOWeekKey(d)) is the Monday of d's week", () => {
    const date = new Date(2026, 6, 15); // a Wednesday
    const key = getISOWeekKey(date);
    const start = getWeekStart(key);
    expect(start.getDay()).toBe(1); // Monday
    expect(getISOWeekKey(start)).toBe(key);
  });

  it("handles the year-boundary week correctly (ISO week 1 can start in late December)", () => {
    const dec31 = new Date(2025, 11, 31); // Wednesday, ISO week 1 of 2026
    expect(getISOWeekKey(dec31)).toBe("2026-W01");
  });
});

describe("distanceLabel", () => {
  it("labels an Ultramarathon (100K) distance as Ultramarathon, not Marathon", () => {
    // Regression test: the display label used to only check `km >= 42 ? "Marathon" : ...`,
    // which had no bucket above marathon, so a 100km race silently rendered as "Marathon".
    expect(distanceLabel(100)).toBe("Ultramarathon");
    expect(distanceLabel(75)).toBe("Ultramarathon");
  });

  it("labels standard race distances correctly", () => {
    expect(distanceLabel(42.195)).toBe("Marathon");
    expect(distanceLabel(21.0975)).toBe("Half Marathon");
    expect(distanceLabel(10)).toBe("10K");
    expect(distanceLabel(5)).toBe("5K");
  });

  it("falls back to a raw km label for non-standard short distances", () => {
    expect(distanceLabel(3)).toBe("3 km");
  });
});

describe("getActualByWeek", () => {
  it("sums distance per ISO week", () => {
    const map = getActualByWeek([
      { date: "2026-07-13", distanceKm: 5 }, // Monday of week 29
      { date: "2026-07-15", distanceKm: 3 },
      { date: "2026-07-20", distanceKm: 10 }, // next week
    ]);
    expect(map.get(getISOWeekKey(new Date(2026, 6, 13)))).toBe(8);
    expect(map.get(getISOWeekKey(new Date(2026, 6, 20)))).toBe(10);
  });
});

describe("generateTimeline", () => {
  const today = new Date(2026, 6, 20); // Monday

  it("returns an empty timeline when there are no upcoming races", () => {
    expect(generateTimeline([], today, new Map())).toEqual([]);
  });

  it("builds a segment ending in a race-phase week on the race's own week", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Test 10K", date: "2026-09-14", distanceKm: 10, baseWeeklyKm: 20 },
    ];
    const timeline = generateTimeline(races, today, new Map());
    const raceWeek = timeline.find((w) => w.weekKey === getISOWeekKey(new Date(2026, 8, 14)));
    expect(raceWeek?.phase).toBe("race");
    expect(timeline.every((w) => w.targetRaceId === "r1" || w.phase === "recovery")).toBe(true);
  });

  it("anchors the first segment to planStartDate instead of always starting at today", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Test Marathon", date: "2026-12-06", distanceKm: 42.195, baseWeeklyKm: 30 },
    ];
    const planStart = new Date(2026, 5, 1); // June 1 — well before `today`
    const timeline = generateTimeline(races, today, new Map(), planStart);
    const firstWeekKey = timeline[0].weekKey;
    expect(firstWeekKey).toBe(getISOWeekKey(planStart));
    // Without the anchor it would start at `today`'s week instead.
    expect(firstWeekKey).not.toBe(getISOWeekKey(today));
  });

  it("ignores a planStartDate that is in the future relative to today", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Test Marathon", date: "2026-12-06", distanceKm: 42.195, baseWeeklyKm: 30 },
    ];
    const futureAnchor = new Date(2026, 7, 1); // after `today`
    const timeline = generateTimeline(races, today, new Map(), futureAnchor);
    expect(timeline[0].weekKey).toBe(getISOWeekKey(today));
  });

  it("inserts recovery weeks after a race before the next segment starts", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Race A", date: "2026-08-02", distanceKm: 10, baseWeeklyKm: 20 },
      { id: "r2", name: "Race B", date: "2026-12-06", distanceKm: 42.195, baseWeeklyKm: 20 },
    ];
    const timeline = generateTimeline(races, today, new Map());
    const recoveryWeeks = timeline.filter((w) => w.phase === "recovery");
    expect(recoveryWeeks.length).toBeGreaterThan(0);
  });

  it("skips recovery slots that would land on or after a closely-following next race", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Race A", date: "2026-08-02", distanceKm: 10, baseWeeklyKm: 20 },
      { id: "r2", name: "Race B", date: "2026-08-09", distanceKm: 10, baseWeeklyKm: 20 }, // 1 week later
    ];
    // Should not throw, and every week must belong to exactly one known phase.
    const timeline = generateTimeline(races, today, new Map());
    expect(timeline.every((w) => ["build", "taper", "race", "recovery"].includes(w.phase))).toBe(true);
  });

  it("applies a manual weekly-target override on top of the auto-generated plan", () => {
    const races: RaceGoalInput[] = [
      { id: "r1", name: "Test 10K", date: "2026-09-14", distanceKm: 10, baseWeeklyKm: 20 },
    ];
    const overrides = new Map([[getISOWeekKey(today), 55]]);
    const timeline = generateTimeline(races, today, overrides);
    const week = timeline.find((w) => w.weekKey === getISOWeekKey(today));
    expect(week?.plannedKm).toBe(55);
    expect(week?.isOverridden).toBe(true);
  });
});
