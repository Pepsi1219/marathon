"use client";

import type { ComputedSplit } from "@/lib/pace-engine";
import { KmRow } from "./km-row";

interface PacingTableProps {
  splits: ComputedSplit[];
  onNudgePace: (index: number, deltaSeconds: number) => void;
  onResetPace: (index: number) => void;
  onToggleWater: (index: number) => void;
  onToggleGel: (index: number) => void;
}

export function PacingTable({ splits, onNudgePace, onResetPace, onToggleWater, onToggleGel }: PacingTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
      <div className="flex items-center justify-between bg-muted/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="w-16 sm:w-28">Split</span>
        <span>Pace</span>
        <span className="w-16 text-right sm:w-20">Clock</span>
      </div>
      <div className="divide-y divide-border/60" style={{ contentVisibility: "auto" }}>
        {splits.map((split, i) => (
          <KmRow
            key={split.index}
            split={split}
            alt={i % 2 === 1}
            onNudgePace={(delta) => onNudgePace(split.index, delta)}
            onResetPace={() => onResetPace(split.index)}
            onToggleWater={() => onToggleWater(split.index)}
            onToggleGel={() => onToggleGel(split.index)}
          />
        ))}
      </div>
    </div>
  );
}
