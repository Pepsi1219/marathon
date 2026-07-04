"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, useAuthUser } from "@/lib/firebase/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v3h3.87c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09C3.24 21.3 7.31 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.27A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuthUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Timer className="size-7" />
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Welcome to Pace Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to save your race plans and pick up where you left off.</p>
        </div>

        <Button
          variant="outline"
          className="h-12 w-full gap-2 text-sm font-semibold"
          disabled={signingIn}
          onClick={async () => {
            setError(null);
            setSigningIn(true);
            try {
              await signInWithGoogle();
              router.replace("/");
            } catch (err) {
              const code = (err as { code?: string })?.code ?? "auth/unknown-error";
              // A user closing the popup isn't an error worth surfacing.
              if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
                return;
              }
              setError(code);
              toast.error("Sign-in failed. Please try again.");
            } finally {
              setSigningIn(false);
            }
          }}
        >
          <GoogleIcon />
          {signingIn ? "Signing in…" : "Continue with Google"}
        </Button>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Couldn&apos;t sign you in. Check your connection and try again.
          </p>
        )}
      </div>
    </div>
  );
}
