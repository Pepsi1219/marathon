"use client";

import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, parseDuration, formatPaceFromSec } from "@/lib/training-plan";
import type { ActivityRecord } from "@/lib/firebase/training";

interface ActivityLogProps {
  activities: ActivityRecord[];
  onLog: (data: Omit<ActivityRecord, "id" | "createdAt">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

interface LogForm {
  date: string;
  distanceKm: string;
  duration: string;
  note: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL: LogForm = { date: todayStr(), distanceKm: "", duration: "", note: "" };

export function ActivityLog({ activities, onLog, onRemove }: ActivityLogProps) {
  const [form, setForm] = useState<LogForm>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  function set(field: keyof LogForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const distanceKm = Number(form.distanceKm);
    if (!distanceKm || distanceKm <= 0) { setError("Enter a valid distance."); return; }
    if (!form.date) { setError("Date is required."); return; }

    let durationSec: number | null = null;
    if (form.duration.trim()) {
      durationSec = parseDuration(form.duration.trim());
      if (durationSec === null) { setError("Duration format: h:mm:ss or m:ss"); return; }
    }

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

  const visible = showAll ? activities : activities.slice(0, 5);

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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-duration" className="text-xs">
              <Clock className="mr-1 inline size-3" />
              Duration
            </Label>
            <Input
              id="log-duration"
              placeholder="h:mm:ss"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              className="h-9 tabular-nums text-sm"
            />
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

      {/* Recent activities */}
      {activities.length > 0 && (
        <div className="flex flex-col gap-1">
          {visible.map((a) => {
            const pace = a.durationSec && a.distanceKm > 0
              ? formatPaceFromSec(a.durationSec / a.distanceKm)
              : null;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
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
          {activities.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Show less" : `Show all ${activities.length} activities`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
