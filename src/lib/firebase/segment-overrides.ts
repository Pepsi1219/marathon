import type { KmSegment } from "@/lib/pace-engine";

export interface SegmentOverride {
  index: number;
  overridePace: number | null;
  hasWater: boolean | null;
  hasGel: boolean | null;
  note: string | null;
}

/**
 * Only persist rows that actually differ from generated defaults — keeps documents small.
 * A row is recorded when its pace is overridden, it has a note, or its water/gel station was
 * manually toggled away from what the interval settings would generate. `defaults` is the set of
 * segments buildSegments() would produce for the same distance/intervals, used as the baseline.
 */
export function toSegmentOverrides(segments: KmSegment[], defaults: KmSegment[]): SegmentOverride[] {
  const defByIndex = new Map(defaults.map((d) => [d.index, d]));
  return segments
    .filter((s) => {
      const def = defByIndex.get(s.index);
      const waterChanged = def ? s.hasWater !== def.hasWater : s.hasWater;
      const gelChanged = def ? s.hasGel !== def.hasGel : s.hasGel;
      return s.overridePace !== null || Boolean(s.note) || waterChanged || gelChanged;
    })
    .map((s) => {
      const def = defByIndex.get(s.index);
      const waterChanged = def ? s.hasWater !== def.hasWater : s.hasWater;
      const gelChanged = def ? s.hasGel !== def.hasGel : s.hasGel;
      return {
        index: s.index,
        overridePace: s.overridePace,
        // Store the actual station state only when it deviates; null means "use the default".
        hasWater: waterChanged ? s.hasWater : null,
        hasGel: gelChanged ? s.hasGel : null,
        note: s.note ?? null,
      };
    });
}

export function applySegmentOverrides(segments: KmSegment[], overrides: SegmentOverride[]): KmSegment[] {
  const byIndex = new Map(overrides.map((o) => [o.index, o]));
  return segments.map((seg) => {
    const override = byIndex.get(seg.index);
    if (!override) return seg;
    return {
      ...seg,
      overridePace: override.overridePace,
      hasWater: override.hasWater ?? seg.hasWater,
      hasGel: override.hasGel ?? seg.hasGel,
      note: override.note ?? undefined,
    };
  });
}
