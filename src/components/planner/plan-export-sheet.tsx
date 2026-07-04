import { forwardRef } from "react";
import type { ComputedSplit, RaceConfig, RaceSummary } from "@/lib/pace-engine";
import { formatPace } from "@/lib/pace-engine";

interface PlanExportSheetProps {
  planName: string;
  config: RaceConfig;
  splits: ComputedSplit[];
  summary: RaceSummary;
}

/**
 * A print-optimized, self-contained pace band. Rendered off-screen and captured to PNG.
 * Uses inline hex colors (not CSS theme variables) so the image looks identical regardless
 * of the app's light/dark theme at capture time.
 */
export const PlanExportSheet = forwardRef<HTMLDivElement, PlanExportSheetProps>(function PlanExportSheet(
  { planName, config, splits, summary },
  ref,
) {
  const accent = "#e8552d";
  const ink = "#1a1a1a";
  const sub = "#6b6b6b";
  const line = "#e6e6e6";

  return (
    <div
      ref={ref}
      style={{
        width: 620,
        background: "#ffffff",
        color: ink,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: 28,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: accent, fontWeight: 700 }}>
            Race Pace Plan
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{planName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Finish</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: accent }}>
            {summary.finishClockTime}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "10px 14px",
          background: "#faf7f5",
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <Meta label="Distance" value={`${config.totalDistanceKm} km`} />
        <Meta label="Start" value={config.startTime} />
        <Meta label="Avg Pace" value={`${summary.averagePace} /km`} />
        <Meta label="Duration" value={summary.totalDuration} />
      </div>

      {/* Splits table */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 10, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1.2fr",
            padding: "8px 14px",
            background: "#f4f2f0",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: sub,
          }}
        >
          <span>KM</span>
          <span>Pace</span>
          <span>Station</span>
          <span style={{ textAlign: "right" }}>Clock</span>
        </div>
        {splits.map((s, i) => {
          const overridden = s.overridePace !== null;
          return (
            <div
              key={s.index}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1.2fr",
                padding: "6px 14px",
                fontSize: 13,
                borderTop: `1px solid ${line}`,
                background: overridden ? "#fdeee8" : i % 2 ? "#fbfafa" : "#ffffff",
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {s.index}
                {!Number.isInteger(s.distanceKm) && (
                  <span style={{ color: sub, fontWeight: 400 }}> +{s.distanceKm}</span>
                )}
              </span>
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: overridden ? 800 : 500,
                  color: overridden ? accent : ink,
                }}
              >
                {formatPace(s.effectivePace)}
              </span>
              <span style={{ fontSize: 12 }}>
                {s.hasWater ? "💧" : ""}
                {s.hasGel ? "⚡" : ""}
              </span>
              <span style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: sub }}>
                {s.clockTime}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: sub, textAlign: "center" }}>
        Generated with Pace Planner · 💧 water · ⚡ gel
      </div>
    </div>
  );
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#9a9a9a" }}>{label}</div>
      <div style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{value}</div>
    </div>
  );
}
