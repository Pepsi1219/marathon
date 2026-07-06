"use client";

import { useState } from "react";
import { Trash2, Flag, CalendarDays, Plus, Pencil, Check, X, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { daysBetween, formatShortDate, formatDuration, type WeekPlan } from "@/lib/training-plan";
import type { RaceGoalRecord, ActivityRecord } from "@/lib/firebase/training";

interface RaceCardsProps {
  races: RaceGoalRecord[];
  activities: ActivityRecord[];
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  today: Date;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: { finishTime: number | null }) => Promise<void>;
}

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function distLabel(km: number): string {
  return km >= 42 ? "Marathon" : km >= 21 ? "Half Marathon" : km >= 10 ? "10K" : `${km} km`;
}

function trainingKmForRace(race: RaceGoalRecord, allRaces: RaceGoalRecord[], activities: ActivityRecord[]): number {
  const sorted = [...allRaces].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sorted.findIndex((r) => r.id === race.id);
  const windowStart = idx > 0 ? sorted[idx - 1].date : null;
  return activities
    .filter((a) => a.date <= race.date && (windowStart === null || a.date > windowStart))
    .reduce((sum, a) => sum + a.distanceKm, 0);
}

// ── Finish time inline editor ──────────────────────────────────────────────────

function FinishTimeEditor({
  value,
  onSave,
}: {
  value: number | null | undefined;
  onSave: (seconds: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [s, setS] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    if (value) {
      setH(String(Math.floor(value / 3600)));
      setM(String(Math.floor((value % 3600) / 60)).padStart(2, "0"));
      setS(String(value % 60).padStart(2, "0"));
    } else {
      setH(""); setM(""); setS("");
    }
    setEditing(true);
  }

  async function handleSave() {
    const total = (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    if (!total) return;
    setSaving(true);
    await onSave(total);
    setSaving(false);
    setEditing(false);
  }

  async function handleClear() {
    setSaving(true);
    await onSave(null);
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center gap-0.5">
          <Input type="number" inputMode="numeric" min={0} placeholder="0" value={h}
            onChange={(e) => setH(e.target.value)}
            className="h-7 w-12 text-center tabular-nums text-xs" />
          <span className="text-[9px] text-muted-foreground">h</span>
        </div>
        <span className="mb-3 text-xs text-muted-foreground">:</span>
        <div className="flex flex-col items-center gap-0.5">
          <Input type="number" inputMode="numeric" min={0} max={59} placeholder="00" value={m}
            onChange={(e) => setM(e.target.value)}
            className="h-7 w-12 text-center tabular-nums text-xs" />
          <span className="text-[9px] text-muted-foreground">min</span>
        </div>
        <span className="mb-3 text-xs text-muted-foreground">:</span>
        <div className="flex flex-col items-center gap-0.5">
          <Input type="number" inputMode="numeric" min={0} max={59} placeholder="00" value={s}
            onChange={(e) => setS(e.target.value)}
            className="h-7 w-12 text-center tabular-nums text-xs" />
          <span className="text-[9px] text-muted-foreground">sec</span>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={handleSave} disabled={saving} aria-label="Save">
          <Check className="size-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="tabular-nums font-medium">{formatDuration(value)}</span>
        <button onClick={startEdit} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
          <Pencil className="size-3" />
        </button>
        <button onClick={handleClear} disabled={saving} className="text-muted-foreground hover:text-destructive" aria-label="Clear">
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startEdit} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <Plus className="size-3" />
      Log time
    </button>
  );
}

// ── Single upcoming race card ──────────────────────────────────────────────────

interface UpcomingCardProps {
  race: RaceGoalRecord;
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  today: Date;
  /** null = hide delete button (used in stacked collapsed view) */
  onRemove: (() => Promise<void>) | null;
}

function UpcomingCard({ race, timeline, actualByWeek, today, onRemove }: UpcomingCardProps) {
  const raceDate = parseLocal(race.date);
  const daysLeft = daysBetween(today, raceDate);
  const raceWeeks = timeline.filter((w) => w.targetRaceId === race.id);
  const totalPlanned = raceWeeks.reduce((s, w) => s + w.plannedKm, 0);
  const totalActual = raceWeeks.reduce((s, w) => s + (actualByWeek.get(w.weekKey) ?? 0), 0);
  const pct = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flag className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{race.name}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {formatShortDate(raceDate)}
                </span>
                <span>{distLabel(race.distanceKm)}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <div className="text-xl font-bold tabular-nums leading-none text-primary">{daysLeft}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">days left</div>
            </div>
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); void onRemove(); }}
                aria-label="Remove race"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {raceWeeks.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Training progress</span>
              <span className="font-medium tabular-nums">{totalActual.toFixed(0)} / {totalPlanned.toFixed(0)} km</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Race strip (tab for non-active card in horizontal deck) ───────────────────

const STRIP_W = 48;

function RaceStrip({ race, today, onClick }: {
  race: RaceGoalRecord;
  today: Date;
  onClick: () => void;
}) {
  const daysLeft = daysBetween(today, parseLocal(race.date));
  return (
    <button
      onClick={onClick}
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card shadow-sm transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
    >
      <Flag className="size-3.5 text-muted-foreground/70" />
      <span
        className="text-sm font-bold tabular-nums leading-none text-primary"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
      >
        {daysLeft}
      </span>
      <span
        className="text-[9px] leading-none text-muted-foreground"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
      >
        days
      </span>
    </button>
  );
}

// ── Horizontal card-deck stack ─────────────────────────────────────────────────

function UpcomingStack({
  races,
  timeline,
  actualByWeek,
  today,
  onRemove,
}: {
  races: RaceGoalRecord[];
  timeline: WeekPlan[];
  actualByWeek: Map<string, number>;
  today: Date;
  onRemove: (id: string) => Promise<void>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const n = races.length;
  const safeActive = Math.min(activeIdx, n - 1);

  if (n === 0) return null;
  if (n === 1) {
    return (
      <UpcomingCard
        race={races[0]}
        timeline={timeline}
        actualByWeek={actualByWeek}
        today={today}
        onRemove={() => onRemove(races[0].id)}
      />
    );
  }

  const nonActive = races.map((r, i) => ({ r, i })).filter(({ i }) => i !== safeActive);

  return (
    <div className="flex flex-col gap-2">
      {/* Header — toggle label stays in same position */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{n} upcoming races</span>
        <button
          onClick={() => { setExpanded((e) => !e); setActiveIdx(0); }}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? "Stack view" : "Show all"}
        </button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-3">
          {races.map((race) => (
            <UpcomingCard
              key={race.id}
              race={race}
              timeline={timeline}
              actualByWeek={actualByWeek}
              today={today}
              onRemove={() => onRemove(race.id)}
            />
          ))}
        </div>
      ) : (
        <div
          className="flex items-stretch gap-1.5"
          onMouseLeave={() => setActiveIdx(0)}
        >
          {/* Active card */}
          <div className="min-w-0 flex-1">
            <UpcomingCard
              race={races[safeActive]}
              timeline={timeline}
              actualByWeek={actualByWeek}
              today={today}
              onRemove={() => onRemove(races[safeActive].id)}
            />
          </div>

          {/* Non-active strips */}
          {nonActive.map(({ r, i }) => (
            <div key={r.id} style={{ width: STRIP_W, flexShrink: 0 }}>
              <RaceStrip race={r} today={today} onClick={() => setActiveIdx(i)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RaceCards({ races, activities, timeline, actualByWeek, today, onRemove, onUpdate }: RaceCardsProps) {
  const upcoming = races.filter((r) => parseLocal(r.date) >= today);
  const past = races
    .filter((r) => parseLocal(r.date) < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (upcoming.length === 0 && past.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Upcoming races (stacked) ── */}
      <UpcomingStack
        races={upcoming}
        timeline={timeline}
        actualByWeek={actualByWeek}
        today={today}
        onRemove={onRemove}
      />

      {/* ── Past races (history) ── */}
      {past.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground">Past Races</p>
          {past.map((race) => {
            const raceDate = parseLocal(race.date);
            const km = trainingKmForRace(race, races, activities);

            return (
              <Card key={race.id} className="border-border/40 bg-muted/20 shadow-sm">
                <CardContent className="flex flex-col gap-3 pt-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Flag className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-muted-foreground">{race.name}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatShortDate(raceDate)}
                          </span>
                          <span>{distLabel(race.distanceKm)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => onRemove(race.id)} aria-label="Remove race"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">Trained</p>
                      <p className="tabular-nums font-semibold">{km.toFixed(0)} km</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">Finish time</p>
                      <FinishTimeEditor
                        value={race.finishTime}
                        onSave={(seconds) => onUpdate(race.id, { finishTime: seconds })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
