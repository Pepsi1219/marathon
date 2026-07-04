import { describe, expect, it } from "vitest";
import { buildSegments } from "@/lib/pace-engine";
import { toSegmentOverrides, applySegmentOverrides } from "./segment-overrides";

const INTERVALS = { waterEveryKm: 2, gelEveryKm: 7 };

describe("segment override persistence", () => {
  it("records nothing when segments match the generated defaults", () => {
    const defaults = buildSegments(10, INTERVALS);
    expect(toSegmentOverrides(defaults, defaults)).toEqual([]);
  });

  it("round-trips a pace override", () => {
    const defaults = buildSegments(10, INTERVALS);
    const edited = defaults.map((s) => (s.index === 3 ? { ...s, overridePace: 300 } : s));

    const overrides = toSegmentOverrides(edited, defaults);
    const restored = applySegmentOverrides(buildSegments(10, INTERVALS), overrides);

    expect(restored[2].overridePace).toBe(300);
  });

  it("round-trips a manually toggled water station (added and removed)", () => {
    const defaults = buildSegments(10, INTERVALS);
    // km1 has no water by default (2,4,6,8,10 do); toggle it ON.
    // km2 has water by default; toggle it OFF.
    const edited = defaults.map((s) => {
      if (s.index === 1) return { ...s, hasWater: true };
      if (s.index === 2) return { ...s, hasWater: false };
      return s;
    });

    const overrides = toSegmentOverrides(edited, defaults);
    const restored = applySegmentOverrides(buildSegments(10, INTERVALS), overrides);

    expect(restored[0].hasWater).toBe(true); // km1 kept ON
    expect(restored[1].hasWater).toBe(false); // km2 kept OFF
    expect(restored[3].hasWater).toBe(true); // km4 untouched default stays ON
  });

  it("round-trips a manually toggled gel station", () => {
    const defaults = buildSegments(10, INTERVALS);
    const edited = defaults.map((s) => (s.index === 1 ? { ...s, hasGel: true } : s));

    const overrides = toSegmentOverrides(edited, defaults);
    const restored = applySegmentOverrides(buildSegments(10, INTERVALS), overrides);

    expect(restored[0].hasGel).toBe(true);
  });
});
