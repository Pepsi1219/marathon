"use client";

import { useState } from "react";
import { Clock, MapPin, Gauge, Droplet, Zap, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPace, STANDARD_DISTANCES, MIN_PACE_SECONDS, MAX_PACE_SECONDS } from "@/lib/pace-engine";

const PACE_OPTIONS: number[] = [];
for (let s = 180; s <= 720; s += 5) {
  if (s >= MIN_PACE_SECONDS && s <= MAX_PACE_SECONDS) PACE_OPTIONS.push(s);
}

interface RaceSetupCardProps {
  startTime: string;
  distanceKm: number;
  defaultPace: number;
  waterEveryKm: number;
  gelEveryKm: number;
  onStartTimeChange: (value: string) => void;
  onDistanceChange: (km: number) => void;
  onDefaultPaceChange: (pace: number) => void;
  onStationIntervalsChange: (waterEveryKm: number, gelEveryKm: number) => void;
}

const CUSTOM_VALUE = "custom";

function FieldLabel({ icon: Icon, children, htmlFor }: { icon: typeof Clock; children: React.ReactNode; htmlFor: string }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </Label>
  );
}

export function RaceSetupCard({
  startTime,
  distanceKm,
  defaultPace,
  waterEveryKm,
  gelEveryKm,
  onStartTimeChange,
  onDistanceChange,
  onDefaultPaceChange,
  onStationIntervalsChange,
}: RaceSetupCardProps) {
  const [customKm, setCustomKm] = useState(String(distanceKm));
  const [customMode, setCustomMode] = useState(() => !STANDARD_DISTANCES.some((d) => d.km === distanceKm));

  const [prevDistanceKm, setPrevDistanceKm] = useState(distanceKm);
  if (distanceKm !== prevDistanceKm) {
    setPrevDistanceKm(distanceKm);
    setCustomKm(String(distanceKm));
    setCustomMode(!STANDARD_DISTANCES.some((d) => d.km === distanceKm));
  }

  const matchedPreset = STANDARD_DISTANCES.find((d) => d.km === distanceKm);
  const selectValue = customMode ? CUSTOM_VALUE : matchedPreset ? String(matchedPreset.km) : CUSTOM_VALUE;

  return (
    <Card className="gap-5 border-border/60 py-5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">Race Setup</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Row 1: Start Time + Distance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2.5">
            <FieldLabel icon={Clock} htmlFor="start-time">Start Time</FieldLabel>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="h-11 text-base font-medium tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <FieldLabel icon={MapPin} htmlFor="distance">
              Distance {customMode && <span className="text-muted-foreground/70">(km)</span>}
            </FieldLabel>
            {customMode ? (
              <div className="relative">
                <Input
                  id="distance"
                  inputMode="decimal"
                  placeholder="e.g. 21.1"
                  autoFocus
                  value={customKm}
                  onChange={(e) => {
                    setCustomKm(e.target.value);
                    const km = Number(e.target.value);
                    if (km > 0) onDistanceChange(km);
                  }}
                  className="h-11 pr-9 text-base font-medium tabular-nums"
                />
                <button
                  type="button"
                  aria-label="Choose a preset distance instead"
                  title="Back to presets"
                  onClick={() => setCustomMode(false)}
                  className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            ) : (
              <Select
                value={selectValue}
                onValueChange={(val) => {
                  if (val === CUSTOM_VALUE) {
                    setCustomMode(true);
                    return;
                  }
                  setCustomMode(false);
                  onDistanceChange(Number(val));
                }}
              >
                <SelectTrigger id="distance" className="w-full text-base font-medium data-[size=default]:h-11">
                  <SelectValue placeholder="Distance">
                    {(value) => {
                      const preset = STANDARD_DISTANCES.find((d) => String(d.km) === value);
                      return preset ? preset.label : "Distance";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_DISTANCES.map((d) => (
                    <SelectItem key={d.km} value={String(d.km)}>
                      {d.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VALUE}>Custom…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Row 2: Pace + Water + Gel */}
        <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-3 sm:grid-cols-[1fr_5rem_5rem]">
          <div className="flex flex-col gap-2.5">
            <FieldLabel icon={Gauge} htmlFor="default-pace">Pace (min/km)</FieldLabel>
            <Select value={String(defaultPace)} onValueChange={(val) => onDefaultPaceChange(Number(val))}>
              <SelectTrigger id="default-pace" className="w-full text-base font-medium tabular-nums data-[size=default]:h-11">
                <SelectValue placeholder="Pace">{(value) => (value ? formatPace(Number(value)) : "Pace")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PACE_OPTIONS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {formatPace(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2.5">
            <FieldLabel icon={Droplet} htmlFor="water-every">Water</FieldLabel>
            <Input
              id="water-every"
              type="number"
              min={0}
              step={0.5}
              value={waterEveryKm}
              onChange={(e) => onStationIntervalsChange(Number(e.target.value) || 0, gelEveryKm)}
              className="h-11 text-base font-medium tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <FieldLabel icon={Zap} htmlFor="gel-every">Gel</FieldLabel>
            <Input
              id="gel-every"
              type="number"
              min={0}
              step={0.5}
              value={gelEveryKm}
              onChange={(e) => onStationIntervalsChange(waterEveryKm, Number(e.target.value) || 0)}
              className="h-11 text-base font-medium tabular-nums"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
