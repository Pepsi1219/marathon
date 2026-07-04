import { describe, expect, it } from "vitest";
import {
  adjustPace,
  buildSegments,
  computeSplits,
  formatPace,
  parsePace,
  secondsToClock,
  secondsToHms,
  summarize,
  type RaceConfig,
} from "./pace-engine";

describe("buildSegments", () => {
  it("builds full-km segments for a round distance", () => {
    const segments = buildSegments(10);
    expect(segments).toHaveLength(10);
    expect(segments[9]).toMatchObject({ index: 10, distanceKm: 1 });
  });

  it("adds a fractional final segment for a marathon", () => {
    const segments = buildSegments(42.195);
    expect(segments).toHaveLength(43);
    expect(segments[42]).toMatchObject({ index: 43, distanceKm: 0.195 });
  });

  it("marks water/gel stations by interval", () => {
    const segments = buildSegments(10, { waterEveryKm: 2, gelEveryKm: 7 });
    expect(segments.filter((s) => s.hasWater).map((s) => s.index)).toEqual([2, 4, 6, 8, 10]);
    expect(segments.filter((s) => s.hasGel).map((s) => s.index)).toEqual([7]);
  });
});

describe("computeSplits", () => {
  const config: RaceConfig = {
    startTime: "06:00",
    totalDistanceKm: 3,
    defaultPace: 360, // 6:00 min/km
  };

  it("matches the worked example from the spec: km1 at default pace", () => {
    const segments = buildSegments(3);
    const splits = computeSplits(config, segments);
    expect(splits[0].clockTime).toBe("06:06:00");
  });

  it("recalculates all subsequent rows when a km is overridden", () => {
    const segments = buildSegments(3);
    segments[2].overridePace = 300; // km3 -> 5:00 min/km
    const splits = computeSplits(config, segments);

    // km1: 06:00 + 6:00 = 06:06:00 (unaffected)
    expect(splits[0].clockTime).toBe("06:06:00");
    // km2: + 6:00 = 06:12:00 (unaffected)
    expect(splits[1].clockTime).toBe("06:12:00");
    // km3: + 5:00 (override) = 06:17:00
    expect(splits[2].clockTime).toBe("06:17:00");
  });

  it("prorates the final fractional segment", () => {
    const segments = buildSegments(3.5);
    const splits = computeSplits(config, segments);
    const last = splits[splits.length - 1];
    expect(last.distanceKm).toBe(0.5);
    expect(last.segmentSeconds).toBe(180); // 0.5 * 360s
  });

  it("wraps clock time past midnight", () => {
    const lateConfig: RaceConfig = { startTime: "23:50", totalDistanceKm: 1, defaultPace: 600 };
    const splits = computeSplits(lateConfig, buildSegments(1));
    expect(splits[0].clockTime).toBe("00:00:00");
  });
});

describe("summarize", () => {
  it("computes finish time, duration, and average pace", () => {
    const config: RaceConfig = { startTime: "06:00", totalDistanceKm: 2, defaultPace: 360 };
    const splits = computeSplits(config, buildSegments(2));
    const summary = summarize(config, splits);
    expect(summary.finishClockTime).toBe("06:12:00");
    expect(summary.totalDuration).toBe("0:12:00");
    expect(summary.averagePace).toBe("6:00");
  });
});

describe("formatting helpers", () => {
  it("formatPace formats seconds as m:ss", () => {
    expect(formatPace(360)).toBe("6:00");
    expect(formatPace(325)).toBe("5:25");
  });

  it("parsePace parses valid m:ss and rejects invalid", () => {
    expect(parsePace("5:30")).toBe(330);
    expect(parsePace("garbage")).toBeNull();
    expect(parsePace("5:75")).toBeNull();
  });

  it("secondsToClock and secondsToHms format correctly", () => {
    expect(secondsToClock(3661)).toBe("01:01:01");
    expect(secondsToHms(3661)).toBe("1:01:01");
  });

  it("adjustPace clamps to sane bounds", () => {
    expect(adjustPace(125, -10)).toBe(120);
    expect(adjustPace(895, 10)).toBe(900);
    expect(adjustPace(360, 5)).toBe(365);
  });
});
