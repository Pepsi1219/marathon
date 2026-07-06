"use client";

import Link from "next/link";
import { ListChecks, TrendingUp } from "lucide-react";
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
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <circle cx="15" cy="5" r="2.5" fill="currentColor"/>
              <path d="M13 7.5 L10.5 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M12 11 L16.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 11 L8.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10.5 14 L14 19.5 L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 14 L7 19 L5 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Pace Planner</div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">Race day, split by split</div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/training" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Training</span>
          </Link>
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
