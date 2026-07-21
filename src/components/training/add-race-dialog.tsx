"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { formatLocalDate } from "@/lib/training-plan";

// ── Inline calendar ────────────────────────────────────────────────────────────

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface CalendarPickerProps {
  value: string;       // "YYYY-MM-DD" or ""
  minDate: string;     // "YYYY-MM-DD"
  onChange: (v: string) => void;
}

function CalendarPicker({ value, minDate, onChange }: CalendarPickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const initial = useMemo(() => {
    const src = value || minDate || today;
    const [y, m] = src.split("-").map(Number);
    return { year: y, month: m - 1 };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [view, setView] = useState(initial);

  function prevMonth() {
    setView((v) => {
      const m = v.month === 0 ? 11 : v.month - 1;
      const y = v.month === 0 ? v.year - 1 : v.year;
      return { year: y, month: m };
    });
  }
  function nextMonth() {
    setView((v) => {
      const m = v.month === 11 ? 0 : v.month + 1;
      const y = v.month === 11 ? v.year + 1 : v.year;
      return { year: y, month: m };
    });
  }

  // First day of month (0=Sun…6=Sat) and total days
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  // Cells: nulls for padding + day numbers
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex size-7 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTH_NAMES[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-7 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <span key={d} className="py-1 text-[11px] font-medium text-muted-foreground">{d}</span>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const dateStr = toDateStr(view.year, view.month, day);
          const disabled = dateStr < minDate;
          const selected = dateStr === value;
          const isToday = dateStr === today;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className={[
                "mx-auto flex size-8 items-center justify-center rounded-full text-sm transition-colors",
                selected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : isToday
                  ? "font-semibold text-primary hover:bg-primary/10"
                  : "hover:bg-muted",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PRESET_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half Marathon (21.1 km)", km: 21.1 },
  { label: "Marathon (42.2 km)", km: 42.2 },
  { label: "Ultramarathon (100 km)", km: 100 },
];

interface AddRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBaseWeeklyKm?: number;
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

function toDateMin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

export function AddRaceDialog({ open, onOpenChange, defaultBaseWeeklyKm, onAdd }: AddRaceDialogProps) {
  const [form, setForm] = useState<FormState>({
    name: "", date: "", distanceKm: "42.2",
    baseWeeklyKm: defaultBaseWeeklyKm ? String(defaultBaseWeeklyKm) : "",
  });
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
      reset();
      onOpenChange(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setForm({ name: "", date: "", distanceKm: "42.2", baseWeeklyKm: defaultBaseWeeklyKm ? String(defaultBaseWeeklyKm) : "" });
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
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
            <Label>Race Date</Label>
            <CalendarPicker
              value={form.date}
              minDate={toDateMin()}
              onChange={(v) => set("date", v)}
            />
          </div>

          {/* Distance */}
          <div className="flex flex-col gap-2">
            <Label>Distance</Label>
            <Select
              value={isPreset ? form.distanceKm : "custom"}
              onValueChange={(val) => {
                if (val && val !== "custom") set("distanceKm", val);
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
