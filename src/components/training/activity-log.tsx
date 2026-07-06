"use client";

import { useState } from "react";
import { Plus, Trash2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, formatPaceFromSec } from "@/lib/training-plan";
import type { ActivityRecord } from "@/lib/firebase/training";

interface ActivityLogProps {
  activities: ActivityRecord[];
  onLog: (data: Omit<ActivityRecord, "id" | "createdAt">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

interface LogForm {
  date: string;
  distanceKm: string;
  paceM: string;
  paceS: string;
  note: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL: LogForm = {
  date: todayStr(),
  distanceKm: "",
  paceM: "",
  paceS: "",
  note: "",
};

export function ActivityLog({ activities, onLog, onRemove }: ActivityLogProps) {
  const [form, setForm] = useState<LogForm>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof LogForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const distanceKm = Number(form.distanceKm);
    if (!distanceKm || distanceKm <= 0) { setError("Enter a valid distance."); return; }
    if (!form.date) { setError("Date is required."); return; }

    const paceM = parseInt(form.paceM) || 0;
    const paceS = parseInt(form.paceS) || 0;
    if (paceS > 59) { setError("Seconds must be 0–59."); return; }
    const paceSec = paceM * 60 + paceS;
    const durationSec = paceSec > 0 ? Math.round(paceSec * distanceKm) : null;

    setSaving(true);
    try {
      await onLog({
        date: form.date,
        distanceKm,
        durationSec,
        note: form.note.trim() || null,
      });
      setForm({ ...INITIAL, date: form.date });
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Log Activity</h3>

      {/* Quick log form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-date" className="text-xs">Date</Label>
            <Input
              id="log-date"
              type="date"
              value={form.date}
              max={todayStr()}
              onChange={(e) => set("date", e.target.value)}
              className="h-9 appearance-none text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-km" className="text-xs">Distance (km)</Label>
            <Input
              id="log-km"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              placeholder="e.g. 10"
              value={form.distanceKm}
              onChange={(e) => set("distanceKm", e.target.value)}
              className="h-9 tabular-nums text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              <Gauge className="mr-1 inline size-3" />
              Pace <span className="font-normal text-muted-foreground">(opt.)</span>
            </Label>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-0.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="5"
                  value={form.paceM}
                  onChange={(e) => set("paceM", e.target.value)}
                  className="h-9 w-16 text-center tabular-nums text-sm"
                />
                <span className="text-[10px] text-muted-foreground">min</span>
              </div>
              <span className="mb-4 text-muted-foreground">:</span>
              <div className="flex flex-col items-center gap-0.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  placeholder="30"
                  value={form.paceS}
                  onChange={(e) => set("paceS", e.target.value)}
                  className="h-9 w-16 text-center tabular-nums text-sm"
                />
                <span className="text-[10px] text-muted-foreground">sec</span>
              </div>
              <span className="mb-4 text-[10px] text-muted-foreground">/km</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-note" className="text-xs">Note (optional)</Label>
            <Input
              id="log-note"
              placeholder="Easy run…"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" size="sm" disabled={saving} className="gap-1.5 self-end">
          <Plus className="size-3.5" />
          {saving ? "Saving…" : "Log Run"}
        </Button>
      </form>

      {/* Activity history */}
      {activities.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{activities.length} activit{activities.length === 1 ? "y" : "ies"}</p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 [-ms-overflow-style:none] [scrollbar-width:thin]">
            {activities.map((a) => {
              const pace = a.durationSec && a.distanceKm > 0
                ? formatPaceFromSec(a.durationSec / a.distanceKm)
                : null;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 border-b border-border/40 px-3 py-2 last:border-0 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium tabular-nums">{a.distanceKm.toFixed(1)} km</span>
                      {a.durationSec && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDuration(a.durationSec)}
                          {pace && <> · {pace}/km</>}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{a.date}</span>
                      {a.note && <span className="truncate">{a.note}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(a.id)}
                    aria-label="Remove activity"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
