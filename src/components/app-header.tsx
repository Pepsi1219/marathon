"use client";

import Link from "next/link";
import { Timer, ListChecks } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Timer className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Pace Planner</div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">Race day, split by split</div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/plans" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
            <ListChecks className="size-4" />
            <span className="hidden sm:inline">My Plans</span>
          </Link>
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
