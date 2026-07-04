"use client";

import Link from "next/link";
import Image from "next/image";
import { LogIn, LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuthUser, signOut } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const { user, loading } = useAuthUser();

  if (loading) return <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />;

  if (!user) {
    return (
      <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
        <LogIn className="size-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2">
      {user.photoURL ? (
        <Image src={user.photoURL} alt="" width={24} height={24} className="size-6 rounded-full" unoptimized />
      ) : (
        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <button
        aria-label="Sign out"
        onClick={() => signOut()}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}
