"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half Marathon (21.1 km)", km: 21.1 },
  { label: "Marathon (42.2 km)", km: 42.2 },
];

interface AddRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    name: string;
    date: string;
    distanceKm: number;
    baseWeeklyKm: number;
  }) => Promise<void>;
}

interface FormState {
  name: string;
  date: string;
  distanceKm: string;
  baseWeeklyKm: string;
}

const INITIAL: FormState = { name: "", date: "", distanceKm: "42.2", baseWeeklyKm: "" };

function toDateMin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function AddRaceDialog({ open, onOpenChange, onAdd }: AddRaceDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const distanceKm = Number(form.distanceKm);
    const baseWeeklyKm = Number(form.baseWeeklyKm);

    if (!form.name.trim()) { setError("Race name is required."); return; }
    if (!form.date) { setError("Race date is required."); return; }
    if (!distanceKm || distanceKm <= 0) { setError("Enter a valid distance."); return; }
    if (!baseWeeklyKm || baseWeeklyKm <= 0) { setError("Enter your current weekly km."); return; }

    setSaving(true);
    try {
      await onAdd({ name: form.name.trim(), date: form.date, distanceKm, baseWeeklyKm });
      setForm(INITIAL);
      onOpenChange(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setForm(INITIAL);
    setError(null);
    onOpenChange(v);
  }

  const isPreset = PRESET_DISTANCES.some((d) => String(d.km) === form.distanceKm);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Race Goal</DialogTitle>
        </DialogHeader>

        <form id="add-race-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Race name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="race-name">Race Name</Label>
            <Input
              id="race-name"
              placeholder="e.g. Bangkok Marathon 2026"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="race-date">Race Date</Label>
            <Input
              id="race-date"
              type="date"
              min={toDateMin()}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="appearance-none"
            />
          </div>

          {/* Distance */}
          <div className="flex flex-col gap-2">
            <Label>Distance</Label>
            <Select
              value={isPreset ? form.distanceKm : "custom"}
              onValueChange={(val) => {
                if (val !== "custom") set("distanceKm", val);
              }}
            >
              <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                <SelectValue placeholder="Select distance">
                  {() => {
                    const preset = PRESET_DISTANCES.find((d) => String(d.km) === form.distanceKm);
                    return preset ? preset.label : `${form.distanceKm} km`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PRESET_DISTANCES.map((d) => (
                  <SelectItem key={d.km} value={String(d.km)}>{d.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {(!isPreset || form.distanceKm === "") && (
              <Input
                type="number"
                inputMode="decimal"
                min={0.1}
                step={0.1}
                placeholder="e.g. 15"
                value={form.distanceKm}
                onChange={(e) => set("distanceKm", e.target.value)}
              />
            )}
          </div>

          {/* Base weekly km */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="base-km">Current Weekly km</Label>
            <Input
              id="base-km"
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              placeholder="e.g. 40"
              value={form.baseWeeklyKm}
              onChange={(e) => set("baseWeeklyKm", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your average weekly training distance right now.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form="add-race-form" disabled={saving}>
            {saving ? "Saving…" : "Add Race"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
