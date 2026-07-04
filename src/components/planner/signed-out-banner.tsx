import Link from "next/link";
import { LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignedOutBanner() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-accent bg-accent px-4 py-3 text-accent-foreground">
      <p className="text-sm">
        <span className="font-semibold">You&apos;re working as a guest.</span>{" "}
        <span className="hidden sm:inline">Sign in to save this plan and pick it up later.</span>
        <span className="sm:hidden">Sign in to save plans.</span>
      </p>
      <Link
        href="/login"
        className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-1.5 bg-accent-foreground text-accent hover:bg-accent-foreground/90")}
      >
        <LogIn className="size-4" />
        Sign in
      </Link>
    </div>
  );
}
