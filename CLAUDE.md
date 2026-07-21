@AGENTS.md

## Project overview

Marathon Pace Planner — a personal, mobile-first PWA for planning race pace km by km.
Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (base-ui variant),
Firebase Auth (Google via `signInWithPopup`), Cloud Firestore, Vitest.

## Key architecture

- **Pace engine** (`src/lib/pace-engine.ts`): pure TS, paces as integer seconds, O(n) split recalculation. `STANDARD_DISTANCES` = 5K, 10K, Half Marathon, Marathon, Ultramarathon 100K.
- **Planner state**: `useReducer` in `src/hooks/use-race-plan.ts`, `useMemo` for computed splits.
- **Firestore**: subcollection `users/{uid}/racePlans/{planId}`. Segment overrides stored sparsely via `src/lib/firebase/segment-overrides.ts`.
- **PNG export** (`src/lib/export-png.ts`): `html-to-image` → Web Share API on mobile, `<a download>` on desktop.
- **Theme**: custom ThemeProvider (`src/components/theme-provider.tsx`), NOT next-themes.
- **PWA**: `public/sw.js` (network-first navigation), manifest via `src/app/manifest.ts`, PNG icons for all platforms.

### Training Tracker (`/training`)

- **Plan engine** (`src/lib/training-plan.ts`): pure TS, zero React/Firebase deps. ISO 8601 week helpers, multi-race progressive overload generator (build → taper → race → recovery), activity aggregation, formatting utils.
  - Algorithm: +10%/week build, down week (×0.75) every 4th, 2-week taper (65%→45% of peak), race week, 2 recovery weeks (50%→70% of base) before next segment.
  - `generateTimeline(races, today, weeklyTargetOverrides, planStartDate?)` → `WeekPlan[]`. `planStartDate` anchors the first segment to when the current first *upcoming* race was added (not "today"), so the plan advances week-by-week instead of resetting on every load — see the comment above its computation in `use-training.ts` for why it's scoped to only the first upcoming race.
  - `getActualByWeek(activities)` → `Map<weekKey, km>`
- **Firestore collections** (`src/lib/firebase/training.ts`):
  - `users/{uid}/raceGoals/{id}` — name, date, distanceKm, baseWeeklyKm
  - `users/{uid}/activities/{id}` — date, distanceKm, durationSec, note
  - `users/{uid}/weeklyTargets/{weekKey}` — plannedKm (sparse overrides only)
- **Hook** (`src/hooks/use-training.ts`): loads all 3 collections in parallel, memoizes timeline + actualByWeek, exposes optimistic-update actions (addRace, logActivity, overrideWeekTarget, …).
- **Components** (`src/components/training/`):
  - `AddRaceDialog` — controlled dialog, inline calendar picker (no external package), distance presets (5K, 10K, Half, Marathon, Ultramarathon 100K) + custom input; `defaultBaseWeeklyKm` pre-fills from first race so user doesn't re-enter it.
  - `WeekCard` — current week progress bar + inline target override/reset
  - `RaceCards` — splits races into upcoming + past. Upcoming: horizontal card-deck (`UpcomingStack`) with CSS Grid column transition; active card shows full content, non-active cards are 48 px `RaceStrip` tabs (Flag icon + days vertical). Past races: muted cards with `FinishTimeEditor` (H/MM/SS inline) and training-km summary. "Show all / Stack view" toggle in header.
  - `PlanChart` — CSS bar chart, planned (phase-colored) vs actual. Scrollbar hidden (`[scrollbar-width:none]`), gradient fade edges. Shows all weeks from 2 weeks before current to race day; km label above each planned bar.
  - `ActivityLog` — quick log form (date, km, pace M:SS /km, note). Duration stored as `paceSec × distanceKm`. History in fixed-height scrollable container (`max-h-72`), shows activity count.
  - ~~`TimelineStrip`~~ — deleted; redundant with PlanChart.

### Dashboard (`/dashboard`)

Suunto/Garmin-style stats & summary page, built entirely from Training Tracker data (no new Firestore collections).

- **Stats engine** (`src/lib/dashboard-stats.ts`): pure TS, zero React/Firebase deps.
  - `computeOverallStats(activities, today)` → totals, this-week/this-month km, longest run, avg pace, current + best ISO-week streak.
  - `computeWeeklyVolumeSeries(activities, timeline, today, weeksBack)` → last N weeks actual vs planned km, independent of any single race segment (unlike `PlanChart`, always ends at the current week).
  - `computeActivityHeatmap(activities, today, weeksBack)` → GitHub-style Mon–Sun × week grid, level 0–4 bucketed by quartiles of the user's own non-zero daily km (adapts to any training volume).
  - `computePersonalRecords(races)` → fastest finish time per distance category (5K/10K/Half/Marathon/Ultramarathon, bucketed by km) from `RaceGoalRecord.finishTime`.
- **Components** (`src/components/dashboard/`): `StatTile` (generic KPI card), `WeeklyRing` (SVG circular progress for current week, `-rotate-90` + `strokeDasharray`/`strokeDashoffset`), `VolumeTrendChart` (bar chart with dashed target line), `ActivityHeatmap`, `PersonalRecords`, `NextRaceCard` (countdown, links to `/training`).
- Same auth-gate pattern as `/training` (`useAuthUser` + redirect to `/login`); reuses `useTraining()` directly, no separate hook.

## Design language

The app uses a clean, minimal modern SaaS aesthetic — sometimes called "Vercel-style" or "Linear-style" design.

- **Font**: [Geist](https://vercel.com/font) by Vercel — geometric sans-serif, clean and highly legible. `Geist_Mono` is used for all pace/clock/numeric displays (tabular-nums).
- **Color palette**: Custom OKLCH-based palette with an orange-red primary accent (`oklch(0.63 0.21 34)` light / `oklch(0.7 0.19 34)` dark). Defined in `src/app/globals.css`.
- **Radius**: Generous rounded corners (`--radius: 0.9rem`) for cards, buttons, inputs.
- **Shadows**: Subtle (`shadow-sm`) — depth via background color differences, not heavy shadows.
- **Icons**: [Lucide React](https://lucide.dev) — consistent stroke-based icons throughout. App logo is an inline SVG running figure (not a Lucide icon) in `app-header.tsx`; PWA icons (`public/icon.svg`, `public/icon-maskable.svg`) use the same running figure on `#e8552d` background.
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
