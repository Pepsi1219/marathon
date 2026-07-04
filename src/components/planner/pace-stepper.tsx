"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { formatPace } from "@/lib/pace-engine";
import { PACE_STEP_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PaceStepperProps {
  pace: number;
  isOverridden: boolean;
  onNudge: (deltaSeconds: number) => void;
  onReset: () => void;
}

export function PaceStepper({ pace, isOverridden, onNudge, onReset }: PaceStepperProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        aria-label={`Decrease pace by ${PACE_STEP_SECONDS} seconds`}
        onClick={() => onNudge(-PACE_STEP_SECONDS)}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-transform active:scale-90 active:bg-muted sm:w-11"
      >
        <Minus className="size-4" />
      </button>

      <span
        className={cn(
          "min-w-12 rounded-lg px-1 py-1.5 text-center font-mono text-sm tabular-nums sm:min-w-16 sm:px-2 sm:text-base",
          isOverridden && "bg-primary font-bold text-primary-foreground shadow-sm",
        )}
      >
        {formatPace(pace)}
      </span>

      <button
        type="button"
        aria-label={`Increase pace by ${PACE_STEP_SECONDS} seconds`}
        onClick={() => onNudge(PACE_STEP_SECONDS)}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-transform active:scale-90 active:bg-muted sm:w-11"
      >
        <Plus className="size-4" />
      </button>

      {isOverridden && (
        <button
          type="button"
          aria-label="Reset to default pace"
          title="Reset to default pace"
          onClick={onReset}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
      )}
    </div>
  );
}
