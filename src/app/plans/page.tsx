"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Timer, Clock, Zap, Trash2, ChevronRight, CloudOff } from "lucide-react";
import { useAuthUser } from "@/lib/firebase/auth";
import { deletePlan, listPlans, savePlan, applySegmentOverrides, type RacePlanRecord } from "@/lib/firebase/plans";
import { buildSegments } from "@/lib/pace-engine";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { formatPace } from "@/lib/pace-engine";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [plans, setPlans] = useState<RacePlanRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    listPlans(user.uid)
      .then((data) => {
        setPlans(data);
        setError(false);
      })
      .catch(() => {
        toast.error("Failed to load plans");
        setError(true);
      });
  }, [user, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  async function handleDelete(planId: string) {
    if (!user) return;
    const plan = plans?.find((p) => p.id === planId);
    await deletePlan(user.uid, planId);
    setPlans((prev) => prev?.filter((p) => p.id !== planId) ?? null);
    toast.success("Plan deleted", {
      action: plan && {
        label: "Undo",
        onClick: async () => {
          try {
            const segments = applySegmentOverrides(
              buildSegments(plan.distanceKm, { waterEveryKm: plan.waterEveryKm, gelEveryKm: plan.gelEveryKm }),
              plan.segmentOverrides,
            );
            await savePlan(
              user.uid,
              plan.name,
              { startTime: plan.startTime, totalDistanceKm: plan.distanceKm, defaultPace: plan.defaultPaceSeconds },
              segments,
              plan.waterEveryKm,
              plan.gelEveryKm,
            );
            listPlans(user.uid).then(setPlans);
          } catch {
            toast.error("Failed to restore plan.");
          }
        },
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">My Race Plans</h1>
          <Link href="/" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            New Plan
          </Link>
        </div>

        {plans === null && !error && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <CloudOff className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Couldn&apos;t load your plans</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Check your connection and try again. Your saved plans are still there.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {!error && plans?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Timer className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              No saved plans yet.
              <br />
              Build one on the planner and hit Save.
            </p>
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Go to planner
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <Link href={`/?planId=${plan.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Timer className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{plan.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {plan.startTime}
                    </span>
                    <span>{plan.distanceKm} km</span>
                    <span className="flex items-center gap-1">
                      <Zap className="size-3" />
                      {formatPace(plan.defaultPaceSeconds)}/km
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
              </Link>
              <button
                aria-label="Delete plan"
                onClick={() => handleDelete(plan.id)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
