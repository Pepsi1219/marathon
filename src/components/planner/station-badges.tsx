"use client";

import { Droplet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StationBadgesProps {
  hasWater: boolean;
  hasGel: boolean;
  onToggleWater: () => void;
  onToggleGel: () => void;
}

export function StationBadges({ hasWater, hasGel, onToggleWater, onToggleGel }: StationBadgesProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Toggle water station"
        onClick={onToggleWater}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors sm:size-7",
          hasWater
            ? "border-blue-400 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
            : "border-transparent text-muted-foreground/30",
        )}
      >
        <Droplet className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Toggle gel station"
        onClick={onToggleGel}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors sm:size-7",
          hasGel
            ? "border-amber-400 bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
            : "border-transparent text-muted-foreground/30",
        )}
      >
        <Zap className="size-3.5" />
      </button>
    </div>
  );
}
