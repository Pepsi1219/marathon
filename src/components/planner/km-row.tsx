"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ComputedSplit } from "@/lib/pace-engine";
import { formatPace } from "@/lib/pace-engine";
import { PACE_STEP_SECONDS } from "@/lib/constants";
import { StationBadges } from "./station-badges";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        "relative grid grid-cols-[5rem_5rem_1fr_6rem] items-center py-2 pl-6 pr-6 sm:grid-cols-[5.5rem_5.5rem_1fr_7rem]",
        alt && !isOverridden && "bg-muted/25",
        isOverridden && "bg-accent/60",
      )}
    >
      {isOverridden && <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary" aria-hidden />}

      {/* Split */}
      <span className="flex items-baseline gap-0.5 text-sm font-semibold tabular-nums sm:text-base">
        <span className="text-muted-foreground/70">#</span>
        {split.index}
        {isFractional && <span className="text-[11px] font-normal text-muted-foreground">+{split.distanceKm}</span>}
      </span>

      {/* Station */}
      <StationBadges
        hasWater={split.hasWater}
        hasGel={split.hasGel}
        onToggleWater={onToggleWater}
        onToggleGel={onToggleGel}
      />

      {/* Pace — tap to open modal */}
      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums transition-colors sm:text-base",
              isOverridden
                ? "bg-primary font-bold text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-muted",
            )}
          >
            {formatPace(split.effectivePace)}
          </DialogTrigger>

          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>
                KM #{split.index} — Pace
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-4">
              <span
                className={cn(
                  "rounded-xl px-6 py-3 font-mono text-4xl font-bold tabular-nums",
                  isOverridden ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {formatPace(split.effectivePace)}
              </span>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={`Decrease pace by ${PACE_STEP_SECONDS} seconds`}
                  onClick={() => onNudgePace(-PACE_STEP_SECONDS)}
                  className="flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-transform active:scale-90 active:bg-muted"
                >
                  <Minus className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={`Increase pace by ${PACE_STEP_SECONDS} seconds`}
                  onClick={() => onNudgePace(PACE_STEP_SECONDS)}
                  className="flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-transform active:scale-90 active:bg-muted"
                >
                  <Plus className="size-5" />
                </button>
              </div>

              {isOverridden && (
                <button
                  type="button"
                  onClick={onResetPace}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  Reset to default
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clock */}
      <span className="text-center font-mono text-xs tabular-nums text-muted-foreground sm:text-sm">
        {split.clockTime}
      </span>
    </div>
  );
}
