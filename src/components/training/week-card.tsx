"use client";

import { useState } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PHASE_META, formatShortDate, type WeekPlan } from "@/lib/training-plan";

interface WeekCardProps {
  week: WeekPlan;
  actualKm: number;
  onOverride: (weekKey: string, km: number) => Promise<void>;
  onClearOverride: (weekKey: string) => Promise<void>;
}

export function WeekCard({ week, actualKm, onOverride, onClearOverride }: WeekCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);

  const pct = week.plannedKm > 0 ? Math.min((actualKm / week.plannedKm) * 100, 100) : 0;
  const remaining = Math.max(week.plannedKm - actualKm, 0);
  const phase = PHASE_META[week.phase];

  async function handleSave() {
    const km = Number(inputVal);
    if (!km || km <= 0) return;
    setSaving(true);
    await onOverride(week.weekKey, km);
    setSaving(false);
    setEditing(false);
  }

  async function handleClear() {
    setSaving(true);
    await onClearOverride(week.weekKey);
    setSaving(false);
  }

  function startEdit() {
    setInputVal(String(week.plannedKm));
    setEditing(true);
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">This Week</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatShortDate(week.weekStart)} – {formatShortDate(week.weekEnd)}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${phase.bg} ${phase.text}`}>
            {phase.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">{actualKm.toFixed(1)} km done</span>
            <span className="text-muted-foreground tabular-nums">{remaining.toFixed(1)} km left</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(pct)}%</span>
            <span className="tabular-nums">{week.plannedKm} km target</span>
          </div>
        </div>

        {/* Target editor */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="h-8 w-24 tabular-nums"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <span className="text-xs text-muted-foreground">km</span>
              <Button size="icon-sm" variant="ghost" onClick={handleSave} disabled={saving} aria-label="Save">
                <Check className="size-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3" />
                {week.isOverridden ? "Override active" : "Override target"}
              </button>
              {week.isOverridden && (
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Reset to auto plan"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
