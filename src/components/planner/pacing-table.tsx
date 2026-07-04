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
      <div className="grid grid-cols-[5rem_5rem_1fr_6rem] items-center bg-muted/60 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[5.5rem_5.5rem_1fr_7rem]">
        <span>Split</span>
        <span>Station</span>
        <span className="text-center">Pace</span>
        <span className="text-center">Clock</span>
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
