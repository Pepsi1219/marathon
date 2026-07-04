"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRacePlan } from "@/hooks/use-race-plan";
import { usePersistedDraft } from "@/hooks/use-persisted-draft";
import { useAuthUser } from "@/lib/firebase/auth";
import { savePlan, updatePlan, getPlan, applySegmentOverrides } from "@/lib/firebase/plans";
import { buildSegments } from "@/lib/pace-engine";
import { exportNodeToPng } from "@/lib/export-png";
import { RaceSetupCard } from "@/components/planner/race-setup-card";
import { PacingTable } from "@/components/planner/pacing-table";
import { StickySummaryBar } from "@/components/planner/sticky-summary-bar";
import { SavePlanDialog } from "@/components/planner/save-plan-dialog";
import { SignedOutBanner } from "@/components/planner/signed-out-banner";
import { PlanExportSheet } from "@/components/planner/plan-export-sheet";
import { AppHeader } from "@/components/app-header";

function PlannerContent() {
  const { state, splits, summary, dispatch } = useRacePlan();
  const { user } = useAuthUser();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState<{ id: string; name: string } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const planName = loadedPlan?.name ?? "My Race Plan";

  async function handleExport() {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportNodeToPng(exportRef.current, planName.replace(/[^\w-]+/g, "_").toLowerCase() || "race-plan");
      toast.success("Saved as PNG");
    } catch {
      toast.error("Couldn't export image");
    } finally {
      setExporting(false);
    }
  }

  usePersistedDraft(
    { config: state.config, segments: state.segments, waterEveryKm: state.waterEveryKm, gelEveryKm: state.gelEveryKm },
    (draft) => {
      if (planId) return; // an explicit ?planId= link always wins over the local draft
      dispatch({ type: "LOAD_PLAN", config: draft.config, segments: draft.segments });
      dispatch({ type: "SET_STATION_INTERVALS", waterEveryKm: draft.waterEveryKm, gelEveryKm: 0 });
    },
  );

  useEffect(() => {
    if (!planId || !user) return;
    getPlan(user.uid, planId).then((plan) => {
      if (!plan) {
        toast.error("Plan not found");
        return;
      }
      const config = {
        startTime: plan.startTime,
        totalDistanceKm: plan.distanceKm,
        defaultPace: plan.defaultPaceSeconds,
      };
      const segments = applySegmentOverrides(
        buildSegments(plan.distanceKm, { waterEveryKm: plan.waterEveryKm, gelEveryKm: plan.gelEveryKm }),
        plan.segmentOverrides,
      );
      dispatch({ type: "LOAD_PLAN", config, segments });
      setLoadedPlan({ id: plan.id, name: plan.name });
    });
    // Only re-run when the target plan or the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, user]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        {!user && <SignedOutBanner />}

        <RaceSetupCard
          startTime={state.config.startTime}
          distanceKm={state.config.totalDistanceKm}
          defaultPace={state.config.defaultPace}
          waterEveryKm={state.waterEveryKm}
          onStartTimeChange={(startTime) => dispatch({ type: "SET_START_TIME", startTime })}
          onDistanceChange={(km) => dispatch({ type: "SET_DISTANCE", km })}
          onDefaultPaceChange={(pace) => dispatch({ type: "SET_DEFAULT_PACE", pace })}
          onWaterIntervalChange={(waterEveryKm) =>
            dispatch({ type: "SET_STATION_INTERVALS", waterEveryKm, gelEveryKm: 0 })
          }
        />

        <PacingTable
          splits={splits}
          onNudgePace={(index, deltaSeconds) => dispatch({ type: "NUDGE_SEGMENT_PACE", index, deltaSeconds })}
          onResetPace={(index) => dispatch({ type: "RESET_SEGMENT", index })}
          onToggleWater={(index) => dispatch({ type: "TOGGLE_WATER", index })}
          onToggleGel={(index) => dispatch({ type: "TOGGLE_GEL", index })}
        />
      </main>

      <StickySummaryBar
        summary={summary}
        onSave={() => setSaveOpen(true)}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Off-screen printable sheet captured by the PNG exporter. */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <PlanExportSheet ref={exportRef} planName={planName} config={state.config} splits={splits} summary={summary} />
      </div>

      <SavePlanDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        saving={saving}
        defaultName={loadedPlan?.name}
        onSave={async (name) => {
          if (!user) {
            toast.error("Sign in to save your plan");
            setSaveOpen(false);
            return;
          }
          setSaving(true);
          try {
            if (loadedPlan) {
              await updatePlan(user.uid, loadedPlan.id, name, state.config, state.segments, state.waterEveryKm, state.gelEveryKm);
              setLoadedPlan({ id: loadedPlan.id, name });
            } else {
              const id = await savePlan(user.uid, name, state.config, state.segments, state.waterEveryKm, state.gelEveryKm);
              setLoadedPlan({ id, name });
            }
            toast.success(`"${name}" saved`);
            setSaveOpen(false);
          } catch {
            toast.error("Failed to save plan");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense>
      <PlannerContent />
    </Suspense>
  );
}
