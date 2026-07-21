import { describe, expect, it } from "vitest";
import {
  computeOverallStats,
  computeWeeklyVolumeSeries,
  computeActivityHeatmap,
  computePersonalRecords,
  type ActivityStatInput,
} from "./dashboard-stats";
import { getISOWeekKey } from "./training-plan";

const today = new Date(2026, 6, 20); // Monday, 2026-07-20

describe("computeOverallStats", () => {
  it("totals distance, runs, and duration-weighted average pace", () => {
    const activities: ActivityStatInput[] = [
      { date: "2026-07-20", distanceKm: 10, durationSec: 3600 }, // 6:00/km
      { date: "2026-07-18", distanceKm: 5, durationSec: null }, // no pace data
    ];
    const stats = computeOverallStats(activities, today);
    expect(stats.totalKm).toBe(15);
    expect(stats.totalRuns).toBe(2);
    expect(stats.avgPaceSecPerKm).toBe(360); // only the 10km run has duration
    expect(stats.longestRunKm).toBe(10);
  });

  it("scopes 'this week' and 'this month' correctly", () => {
    const activities: ActivityStatInput[] = [
      { date: "2026-07-20", distanceKm: 10, durationSec: null }, // this week + this month
      { date: "2026-07-01", distanceKm: 5, durationSec: null }, // earlier this month, different week
      { date: "2026-06-01", distanceKm: 20, durationSec: null }, // different month entirely
    ];
    const stats = computeOverallStats(activities, today);
    expect(stats.thisWeekKm).toBe(10);
    expect(stats.thisMonthKm).toBe(15);
  });

  it("computes a current streak that survives an in-progress week with no activity yet", () => {
    // Ran last week and the week before, nothing logged yet this week (it's only Monday).
    const activities: ActivityStatInput[] = [
      { date: "2026-07-13", distanceKm: 5, durationSec: null },
      { date: "2026-07-06", distanceKm: 5, durationSec: null },
    ];
    const stats = computeOverallStats(activities, today);
    expect(stats.currentWeekStreak).toBe(2);
  });

  it("resets the current streak across a gap week", () => {
    const activities: ActivityStatInput[] = [
      { date: "2026-07-20", distanceKm: 5, durationSec: null }, // this week
      { date: "2026-06-01", distanceKm: 5, durationSec: null }, // long gap before
    ];
    const stats = computeOverallStats(activities, today);
    expect(stats.currentWeekStreak).toBe(1);
  });

  it("finds the best streak across the whole history, even if it isn't the current one", () => {
    const activities: ActivityStatInput[] = [
      { date: "2026-05-04", distanceKm: 5, durationSec: null },
      { date: "2026-05-11", distanceKm: 5, durationSec: null },
      { date: "2026-05-18", distanceKm: 5, durationSec: null }, // 3-week streak in the past
      { date: "2026-07-20", distanceKm: 5, durationSec: null }, // isolated, current week
    ];
    const stats = computeOverallStats(activities, today);
    expect(stats.bestWeekStreak).toBe(3);
    expect(stats.currentWeekStreak).toBe(1);
  });
});

describe("computeWeeklyVolumeSeries", () => {
  it("returns exactly weeksBack points ending on the current week", () => {
    const points = computeWeeklyVolumeSeries([], [], today, 4);
    expect(points).toHaveLength(4);
    expect(points[points.length - 1].weekKey).toBe(getISOWeekKey(today));
    expect(points[points.length - 1].isCurrent).toBe(true);
  });

  it("pulls actual km from activities regardless of whether a plan exists for that week", () => {
    const activities: ActivityStatInput[] = [{ date: "2026-07-20", distanceKm: 12, durationSec: null }];
    const points = computeWeeklyVolumeSeries(activities, [], today, 1);
    expect(points[0].actualKm).toBe(12);
    expect(points[0].plannedKm).toBeNull();
  });
});

describe("computeActivityHeatmap", () => {
  it("gives every logged day the darkest level when training volume is perfectly uniform", () => {
    // Regression test: with equal quartile thresholds (t1 === t2 === t3), a `<=` comparison
    // checked from the bottom always matches the first (lightest) bucket, making a runner who
    // trains every single day at the same distance look like they barely ran at all.
    const activities: ActivityStatInput[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      activities.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, distanceKm: 5, durationSec: null });
    }
    const weeks = computeActivityHeatmap(activities, today, 3);
    const loggedDays = weeks.flat().filter((d) => d.km > 0);
    expect(loggedDays.length).toBeGreaterThan(0);
    expect(loggedDays.every((d) => d.level === 4)).toBe(true);
  });

  it("marks rest days as level 0 and days after today as future", () => {
    const weeks = computeActivityHeatmap([], today, 1);
    const allDays = weeks.flat();
    expect(allDays.every((d) => d.km === 0 && d.level === 0)).toBe(true);
    const future = allDays.filter((d) => d.date > today);
    expect(future.every((d) => d.isFuture)).toBe(true);
  });

  it("spreads varied distances across multiple levels", () => {
    const distances = [3, 6, 9, 12, 15, 18, 21];
    const activities: ActivityStatInput[] = distances.map((km, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { date: dateStr, distanceKm: km, durationSec: null };
    });
    const weeks = computeActivityHeatmap(activities, today, 2);
    const levels = new Set(weeks.flat().filter((d) => d.km > 0).map((d) => d.level));
    expect(levels.size).toBeGreaterThan(1);
  });
});

describe("computePersonalRecords", () => {
  it("buckets an Ultramarathon distance into its own category, not Marathon", () => {
    const records = computePersonalRecords([
      { name: "100K Ultra", date: "2026-01-10", distanceKm: 100, finishTime: 36000 },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].category).toBe("Ultramarathon");
  });

  it("keeps only the fastest finish time per category", () => {
    const records = computePersonalRecords([
      { name: "Marathon A", date: "2026-01-10", distanceKm: 42.195, finishTime: 15000 },
      { name: "Marathon B (faster)", date: "2026-03-01", distanceKm: 42.195, finishTime: 14000 },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].raceName).toBe("Marathon B (faster)");
    expect(records[0].finishTimeSec).toBe(14000);
  });

  it("ignores races with no finish time logged", () => {
    const records = computePersonalRecords([
      { name: "No time yet", date: "2026-01-10", distanceKm: 10, finishTime: null },
    ]);
    expect(records).toHaveLength(0);
  });
});
