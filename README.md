# Marathon Pace Planner

A personal, mobile-first PWA for planning your race pace km by km. Set a start
time, distance, and default pace, then fine-tune individual splits on race day —
every downstream clock time recalculates instantly.

## Features

- **Dynamic pacing table** — per-km pace overrides with instant recalculation of
  all following splits, plus a one-tap reset per row.
- **Hydration & fuel markers** — toggle water 💧 and gel ⚡ stations on any km.
- **Sticky summary** — live finish time, total duration, and average pace.
- **Save & load** — Google sign-in with per-user race plans in Firestore.
- **PNG export** — download a clean, printable pace band for any plan.
- **Installable PWA** — add to your home screen with offline support.
- **Dark mode** and zoom-locked, touch-optimized mobile layout.

## Tech stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4 + shadcn/ui (base-ui variant)
- Firebase Auth (Google) + Cloud Firestore
- Vitest for the pure pace-engine and persistence logic

## Getting started

```bash
npm install
npm run dev
```

Create a `.env.local` with your Firebase web config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Firestore security rules live in `firestore.rules`.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npx vitest run   # run tests
```
