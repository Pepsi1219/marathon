"use client";

import { Save, Download, Loader2 } from "lucide-react";
import type { RaceSummary } from "@/lib/pace-engine";
import { Button } from "@/components/ui/button";

interface StickySummaryBarProps {
  summary: RaceSummary;
  onSave: () => void;
  onExport: () => void;
  exporting?: boolean;
}

function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div>
      <div className={primary ? "text-[11px] text-primary-foreground/80" : "text-[11px] text-muted-foreground"}>
        {label}
      </div>
      <div className={primary ? "font-mono text-lg font-bold tabular-nums" : "font-mono text-sm font-semibold tabular-nums sm:text-base"}>
        {value}
      </div>
    </div>
  );
}

export function StickySummaryBar({ summary, onSave, onExport, exporting }: StickySummaryBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-primary px-4 py-2 text-primary-foreground sm:gap-6">
          <Stat label="Finish" value={summary.finishClockTime} primary />
          <div className="h-8 w-px bg-primary-foreground/25" />
          <Stat label="Duration" value={summary.totalDuration} primary />
          <div className="hidden h-8 w-px bg-primary-foreground/25 sm:block" />
          <div className="hidden sm:block">
            <Stat label="Avg Pace" value={summary.averagePace} primary />
          </div>
        </div>
        <Button
          size="lg"
          variant="outline"
          disabled={exporting}
          aria-label="Export as PNG"
          className="h-14 shrink-0 gap-1.5 border-border px-3"
          onClick={onExport}
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">PNG</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 shrink-0 gap-1.5 border-primary/40 px-4 text-primary hover:bg-primary/10"
          onClick={onSave}
        >
          <Save className="size-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
    </div>
  );
}
