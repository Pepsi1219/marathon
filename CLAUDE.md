@AGENTS.md

## Project overview

Marathon Pace Planner — a personal, mobile-first PWA for planning race pace km by km.
Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (base-ui variant),
Firebase Auth (Google via `signInWithPopup`), Cloud Firestore, Vitest.

## Key architecture

- **Pace engine** (`src/lib/pace-engine.ts`): pure TS, paces as integer seconds, O(n) split recalculation.
- **Planner state**: `useReducer` in `src/hooks/use-race-plan.ts`, `useMemo` for computed splits.
- **Firestore**: subcollection `users/{uid}/racePlans/{planId}`. Segment overrides stored sparsely via `src/lib/firebase/segment-overrides.ts`.
- **PNG export** (`src/lib/export-png.ts`): `html-to-image` → Web Share API on mobile, `<a download>` on desktop.
- **Theme**: custom ThemeProvider (`src/components/theme-provider.tsx`), NOT next-themes.
- **PWA**: `public/sw.js` (network-first navigation), manifest via `src/app/manifest.ts`, PNG icons for all platforms.

### Training Tracker (`/training`)

- **Plan engine** (`src/lib/training-plan.ts`): pure TS, zero React/Firebase deps. ISO 8601 week helpers, multi-race progressive overload generator (build → taper → race → recovery), activity aggregation, formatting utils.
  - Algorithm: +10%/week build, down week (×0.75) every 4th, 2-week taper (65%→45% of peak), race week, 2 recovery weeks (50%→70% of base) before next segment.
  - `generateTimeline(races, today, weeklyTargetOverrides)` → `WeekPlan[]`
  - `getActualByWeek(activities)` → `Map<weekKey, km>`
- **Firestore collections** (`src/lib/firebase/training.ts`):
  - `users/{uid}/raceGoals/{id}` — name, date, distanceKm, baseWeeklyKm
  - `users/{uid}/activities/{id}` — date, distanceKm, durationSec, note
  - `users/{uid}/weeklyTargets/{weekKey}` — plannedKm (sparse overrides only)
- **Hook** (`src/hooks/use-training.ts`): loads all 3 collections in parallel, memoizes timeline + actualByWeek, exposes optimistic-update actions (addRace, logActivity, overrideWeekTarget, …).
- **Components** (`src/components/training/`):
  - `AddRaceDialog` — controlled dialog, inline calendar picker (no external package), distance presets + custom input; `defaultBaseWeeklyKm` pre-fills from first race so user doesn't re-enter it.
  - `WeekCard` — current week progress bar + inline target override/reset
  - `RaceCards` — splits races into upcoming + past. Upcoming: horizontal card-deck (`UpcomingStack`) with CSS Grid column transition; active card shows full content, non-active cards are 48 px `RaceStrip` tabs (Flag icon + days vertical). Past races: muted cards with `FinishTimeEditor` (H/MM/SS inline) and training-km summary. "Show all / Stack view" toggle in header.
  - `PlanChart` — CSS bar chart, planned (phase-colored) vs actual. Scrollbar hidden (`[scrollbar-width:none]`), gradient fade edges. Shows all weeks from 2 weeks before current to race day; km label above each planned bar.
  - `ActivityLog` — quick log form (date, km, pace M:SS /km, note). Duration stored as `paceSec × distanceKm`. History in fixed-height scrollable container (`max-h-72`), shows activity count.
  - ~~`TimelineStrip`~~ — deleted; redundant with PlanChart.

## Design language

The app uses a clean, minimal modern SaaS aesthetic — sometimes called "Vercel-style" or "Linear-style" design.

- **Font**: [Geist](https://vercel.com/font) by Vercel — geometric sans-serif, clean and highly legible. `Geist_Mono` is used for all pace/clock/numeric displays (tabular-nums).
- **Color palette**: Custom OKLCH-based palette with an orange-red primary accent (`oklch(0.63 0.21 34)` light / `oklch(0.7 0.19 34)` dark). Defined in `src/app/globals.css`.
- **Radius**: Generous rounded corners (`--radius: 0.9rem`) for cards, buttons, inputs.
- **Shadows**: Subtle (`shadow-sm`) — depth via background color differences, not heavy shadows.
- **Icons**: [Lucide React](https://lucide.dev) — consistent stroke-based icons throughout.
- **Dark mode**: Custom ThemeProvider (`src/components/theme-provider.tsx`), no-flash script via `next/script strategy="beforeInteractive"`.

## Tech constraints

- shadcn/ui **base-ui variant**: `Button` has NO `asChild` prop — use `buttonVariants()` with `<Link>` instead.
- `SelectValue` displays raw value string — use render-function children to format display: `{(value) => formatPace(Number(value))}`.
- `SelectTrigger` height: use `data-[size=default]:h-11` (not `h-11` which gets overridden internally).
- `signInWithPopup` only, NEVER `signInWithRedirect` (silently fails on localhost due to storage partitioning).
- Vitest config must be `.mts` (not `.ts`) for ESM compatibility.
- Node.js is at `D:\nodejs` (not on system PATH — prefix commands with `export PATH="/d/nodejs:$PATH"`).
- "Mirror props into state during render" pattern (not useEffect) for syncing external props → required by `react-hooks/set-state-in-effect` ESLint rule.

## Commands

```bash
export PATH="/d/nodejs:$PATH"
npm run dev           # dev server
npm run build         # production build
npx tsc --noEmit      # typecheck
npx eslint .          # lint
npx vitest run        # tests
```

## Git

- Local branch: `master`, remote branch: `main` → push with `git push origin master:main`.
- Remote: `https://github.com/Pepsi1219/marathon`

## Rules

- **Never push to GitHub** (`git push`) unless the user explicitly asks for it.
- User tests all UI in browser themselves — don't self-test with preview tools.
