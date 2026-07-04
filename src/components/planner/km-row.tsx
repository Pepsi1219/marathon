"use client";

import type { ComputedSplit } from "@/lib/pace-engine";
import { PaceStepper } from "./pace-stepper";
import { StationBadges } from "./station-badges";
import { cn } from "@/lib/utils";

interface KmRowProps {
  split: ComputedSplit;
  alt?: boolean;
  onNudgePace: (deltaSeconds: number) => void;
  onResetPace: () => void;
  onToggleWater: () => void;
  onToggleGel: () => void;
}

export function KmRow({ split, alt, onNudgePace, onResetPace, onToggleWater, onToggleGel }: KmRowProps) {
  const isOverridden = split.overridePace !== null;
  const isFractional = !Number.isInteger(split.distanceKm);

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-1 py-2 pl-3 pr-2 sm:gap-2 sm:px-3",
        alt && !isOverridden && "bg-muted/25",
        isOverridden && "bg-accent/60",
      )}
    >
      {isOverridden && <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary" aria-hidden />}

      <div className="flex min-w-0 shrink-0 flex-col gap-0.5 sm:w-28 sm:flex-row sm:items-center sm:gap-2">
        <span className="flex items-baseline gap-1 text-sm font-semibold tabular-nums sm:text-base">
          <span className="text-muted-foreground/70">#</span>
          {split.index}
          {isFractional && <span className="text-[11px] font-normal text-muted-foreground">+{split.distanceKm}</span>}
        </span>
        <StationBadges
          hasWater={split.hasWater}
          hasGel={split.hasGel}
          onToggleWater={onToggleWater}
          onToggleGel={onToggleGel}
        />
      </div>

      <PaceStepper pace={split.effectivePace} isOverridden={isOverridden} onNudge={onNudgePace} onReset={onResetPace} />

      <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:w-20 sm:text-sm">
        {split.clockTime}
      </span>
    </div>
  );
}
