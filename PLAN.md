# 🏃 Marathon Pace Planner — System Design & Roadmap

PWA สำหรับนักวิ่งมาราธอน ใช้วางแผน pace รายกิโลเมตรก่อนวันแข่ง

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Firebase (Auth: Google · Firestore) · `next-pwa` หรือ Serwist สำหรับ PWA

**Decisions (confirmed):**
- UI Language: **English**
- Auth: **Google Sign-In only** (personal use)
- Hydration/Gel defaults: water every 2 km, gel every 7 km (editable in UI)
- Backend: **Firebase / Firestore** (switched from Supabase)

---

## 1. ภาพรวมระบบ (System Overview)

```
┌─────────────────────────────────────────────────┐
│                  PWA (Next.js)                  │
│                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌──────────┐  │
│  │  Planner  │  │  My Plans    │  │ Settings │  │
│  │  (หน้าหลัก) │  │  (รายการแผน)  │  │          │  │
│  └─────┬─────┘  └──────┬───────┘  └──────────┘  │
│        │               │                        │
│  ┌─────▼───────────────▼─────┐                  │
│  │  Pace Engine (pure TS,    │  ← คำนวณ client-side │
│  │  client-side, instant)    │     ล้วน ไม่ต้องรอ server │
│  └─────┬─────────────────────┘                  │
│        │ save / load                            │
└────────┼────────────────────────────────────────┘
         ▼
   ┌──────────────┐
   │   Firebase   │  Auth (Google Sign-In)
   │  Firestore   │  racePlans collection + Security Rules
   └──────────────┘
```

**หลักการสำคัญ:** การคำนวณทั้งหมดเป็น **pure function ฝั่ง client** — แก้ pace แล้วตารางอัปเดตทันที ไม่มี network round-trip / Supabase ใช้แค่เก็บ-โหลดแผนเท่านั้น

---

## 2. ฟีเจอร์ทั้งหมด (Feature List)

### Phase 1 — MVP (Core)
| # | ฟีเจอร์ | รายละเอียด |
|---|---------|-----------|
| 1 | Race Setup | เลือกระยะ (5K / 10K / Half 21.0975 / Full 42.195 / Custom), Start Time, Default Pace |
| 2 | Pacing Table | ตารางกม. 1 → 42 + เศษ 0.195 กม.สุดท้าย แสดง pace, split time (เวลาที่จะถึงจุดนั้น), elapsed time |
| 3 | Per-KM Pace Override | ปุ่ม +5s / −5s ขนาดใหญ่ (touch target ≥ 44px) แตะแล้วแถวถัดไปทั้งหมด recalculate ทันที |
| 4 | Sticky Summary Bar | ติดล่างจอ แสดง Finish Time, Total Duration, Avg Pace — อัปเดต real-time |
| 5 | Hydration/Gel Stations | mark กม.ที่มีจุดน้ำ/เจล แสดง icon 💧/⚡ ในแถวนั้น (default: น้ำทุก 2.5 กม., เจลทุก 7 กม. — แก้ได้) |
| 6 | Save/Load Plans | บันทึกลง Supabase, list แผนทั้งหมด, เปิดกลับมาแก้ต่อ |
| 7 | Auth | Firebase Auth — Google Sign-In only |
| 8 | Dark Mode | `next-themes` + Tailwind `dark:` — default ตาม system |
| 9 | PWA | Installable, ใช้งาน offline ได้ (แผนล่าสุด cache ไว้), manifest + service worker |

### Phase 2 — Nice to Have
- **Pace Strategy Presets:** Even Split / Negative Split / Positive Split — กดปุ่มเดียว generate pace ทั้งตาราง
- **Range Edit:** เลือกช่วง เช่น กม. 30–42 แล้วปรับ pace ทีเดียว (จำลอง "hitting the wall")
- **Race Day Mode:** จอใหญ่พิเศษ แสดง target time ของกม.ถัดไป + wake lock กันจอดับ
- **Share Plan:** export เป็นภาพ (pace band สำหรับพิมพ์รัดข้อมือ) หรือ share link แบบ read-only
- **Elevation Note:** ใส่โน้ตต่อกม. เช่น "ขึ้นสะพาน", "ทางลง"

### Phase 3 — Future
- Import GPX ของสนามจริง → auto-suggest pace ตาม elevation
- เปรียบเทียบ plan vs ผลจริง (import จาก Strava/Garmin)
- คำนวณ heart rate zone / คาดการณ์ตาม VO2max

---

## 3. Client-Side Pacing Engine (TypeScript)

หัวใจของแอพ — pure functions ทดสอบง่าย ไม่ผูกกับ React

```ts
// lib/pace-engine.ts

/** เก็บ pace เป็น "วินาทีต่อกม." (integer) เสมอ — เลี่ยง floating point ของ min:sec */
export type PaceSeconds = number;

export interface KmSegment {
  /** ลำดับ segment: 1..42, และ 43 = เศษ 0.195 กม. */
  index: number;
  /** ระยะของ segment นี้ (กม.) — ปกติ 1, segment สุดท้าย 0.195 */
  distanceKm: number;
  /** null = ใช้ default pace, มีค่า = user override แล้ว */
  overridePace: PaceSeconds | null;
  hasWater: boolean;
  hasGel: boolean;
  note?: string;
}

export interface ComputedSplit extends KmSegment {
  effectivePace: PaceSeconds;      // pace ที่ใช้จริง (override ?? default)
  segmentSeconds: number;          // เวลาที่ใช้วิ่ง segment นี้
  cumulativeSeconds: number;       // เวลาสะสมตั้งแต่ปล่อยตัว
  clockTime: string;               // เวลานาฬิกาจริง เช่น "06:17:24"
  cumulativeDistanceKm: number;    // ระยะสะสม
}

export interface RaceConfig {
  startTime: string;               // "06:00" (HH:mm, 24h)
  totalDistanceKm: number;         // 42.195
  defaultPace: PaceSeconds;        // เช่น 360 = 6:00 min/km
}

/** สร้าง segments เริ่มต้นจากระยะรวม เช่น 42.195 → 42 segments เต็ม + 1 segment 0.195 */
export function buildSegments(totalKm: number): KmSegment[] {
  const fullKms = Math.floor(totalKm);
  const remainder = +(totalKm - fullKms).toFixed(3);
  const segments: KmSegment[] = [];

  for (let i = 1; i <= fullKms; i++) {
    segments.push({
      index: i,
      distanceKm: 1,
      overridePace: null,
      hasWater: i % 2 === 0 && i > 0,   // default: จุดน้ำทุก 2 กม. (ปรับได้)
      hasGel: i % 7 === 0,              // default: เจลทุก 7 กม.
    });
  }
  if (remainder > 0) {
    segments.push({
      index: fullKms + 1,
      distanceKm: remainder,
      overridePace: null,
      hasWater: false,
      hasGel: false,
    });
  }
  return segments;
}

/**
 * คำนวณ splits ทั้งตารางแบบสะสม — O(n) ครั้งเดียว
 * แก้ pace กม.ไหนก็ตาม เรียกฟังก์ชันนี้ใหม่ทั้งก้อน (42 แถว เร็วมาก ไม่ต้อง optimize เพิ่ม)
 */
export function computeSplits(
  config: RaceConfig,
  segments: KmSegment[],
): ComputedSplit[] {
  const [h, m] = config.startTime.split(":").map(Number);
  const startSeconds = h * 3600 + m * 60;

  let cumulative = 0;
  let cumDistance = 0;

  return segments.map((seg) => {
    const pace = seg.overridePace ?? config.defaultPace;
    // ปัดเป็นวินาทีเต็มตอน "แสดงผล" เท่านั้น — เก็บทศนิยมไว้ใน cumulative กันคลาดเคลื่อนสะสม
    const segmentSeconds = pace * seg.distanceKm;
    cumulative += segmentSeconds;
    cumDistance += seg.distanceKm;

    return {
      ...seg,
      effectivePace: pace,
      segmentSeconds,
      cumulativeSeconds: cumulative,
      cumulativeDistanceKm: +cumDistance.toFixed(3),
      clockTime: secondsToClock(startSeconds + cumulative),
    };
  });
}

/** สรุปสำหรับ Sticky Summary Bar */
export function summarize(config: RaceConfig, splits: ComputedSplit[]) {
  const last = splits[splits.length - 1];
  const totalSeconds = last?.cumulativeSeconds ?? 0;
  return {
    finishClockTime: last?.clockTime ?? "--:--",
    totalDuration: secondsToHms(totalSeconds),          // "4:13:10"
    averagePace: formatPace(totalSeconds / config.totalDistanceKm), // "6:00"
  };
}

// ---------- formatting helpers ----------

export function secondsToClock(totalSeconds: number): string {
  const s = Math.round(totalSeconds) % 86400;
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

export function secondsToHms(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** 360 → "6:00" (min/km) */
export function formatPace(pace: PaceSeconds): string {
  const rounded = Math.round(pace);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

/** "5:30" → 330 — สำหรับ input field */
export function parsePace(text: string): PaceSeconds | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** ปรับ pace ±step วินาที พร้อม clamp กันค่าเพี้ยน (2:00–15:00 min/km) */
export function adjustPace(current: PaceSeconds, deltaSeconds: number): PaceSeconds {
  return Math.min(900, Math.max(120, current + deltaSeconds));
}
```

**จุดออกแบบที่สำคัญ:**
- เก็บ pace เป็น **integer วินาที** ตลอด → ไม่มีปัญหา floating point ตอนบวกลบ
- segment สุดท้าย 0.195 กม. คิดเวลาเป็นสัดส่วน (`pace × 0.195`)
- `overridePace: null` แปลว่า "ตาม default" → ถ้า user เปลี่ยน default pace ทีหลัง แถวที่ไม่ได้ override จะขยับตามอัตโนมัติ ส่วนแถวที่ override ไว้คงเดิม
- recalculate ทั้งตาราง O(42) ทุกครั้งที่แก้ — เร็วพอ ไม่ต้อง memo รายแถว

**ตัวอย่างตามโจทย์:** Start 06:00, default 6:00 → กม.1 = 06:06:00. ถ้า override กม.3 เป็น 5:00 → กม.3 = 06:06 + 06:00 + 05:00 = **06:17:00** และทุกแถวหลังจากนั้นขยับขึ้น 1 นาทีทันที ✅

### State Management
ใช้ `useReducer` (หรือ Zustand ถ้าโตขึ้น) เก็บ `RaceConfig + KmSegment[]` แล้ว `useMemo(() => computeSplits(...), [config, segments])` — ไม่ต้องมี state ของค่าที่คำนวณได้

---

## 4. UI Component Structure

```
app/
├── layout.tsx                    # ThemeProvider, PWA meta, fonts
├── page.tsx                      # redirect → /planner
├── planner/
│   └── page.tsx                  # หน้าหลัก (client component)
├── plans/
│   └── page.tsx                  # รายการแผนที่บันทึกไว้
├── login/
│   └── page.tsx                  # Firebase Google Sign-In button
└── manifest.ts                   # PWA manifest

components/
├── planner/
│   ├── RaceSetupCard.tsx         # Start time picker, distance select, default pace input
│   ├── PaceStrategyBar.tsx       # (Phase 2) ปุ่ม preset Even/Negative/Positive split
│   ├── PacingTable.tsx           # container ของตาราง — รับ splits[] มา render
│   │   └── KmRow.tsx             # แถวเดียว: กม. | pace ± | split clock time | station icons
│   │       ├── PaceStepper.tsx   # [−5s]  5:55  [+5s]  ปุ่มใหญ่ h-11 (44px) สำหรับนิ้วโป้ง
│   │       └── StationBadges.tsx # 💧 ⚡ icons + toggle ได้จาก long-press/tap
│   ├── StickySummaryBar.tsx      # fixed bottom: Finish 10:13 AM · 4:13:10 · avg 6:00
│   └── SavePlanDialog.tsx        # shadcn Dialog — ตั้งชื่อแผน + save
├── plans/
│   ├── PlanCard.tsx              # ชื่อแผน, ระยะ, finish time, updated_at
│   └── PlanListEmpty.tsx
└── ui/                           # shadcn/ui: button, card, dialog, input, select,
                                  # table, badge, skeleton, sonner (toast)

lib/
├── pace-engine.ts                # (ตามข้อ 3) pure logic + unit tests
├── firebase/
│   ├── client.ts                 # firebase app + auth + firestore init (browser)
│   ├── auth.ts                   # signInWithGoogle / signOut / useAuthUser hook
│   └── plans.ts                  # savePlan / listPlans / getPlan / deletePlan (Firestore SDK)
└── constants.ts                  # ระยะมาตรฐาน, pace limits, station defaults

hooks/
├── use-race-plan.ts              # useReducer: config + segments + actions
└── use-persisted-draft.ts        # auto-save draft ลง localStorage (offline-first)
```

### Mobile-first Layout ของ `KmRow`
```
┌──────────────────────────────────────────────┐
│ KM 3  💧⚡        [−5s]  5:00  [+5s]   06:17:00 │  ← แถวปกติ สูง ~56px
└──────────────────────────────────────────────┘
```
- แถวที่ override แล้ว → highlight สี primary อ่อน + จุดบอกว่า "แก้เอง" (แตะค้างเพื่อ reset กลับ default)
- แถวที่มี station → พื้นหลัง tint ฟ้าอ่อน (น้ำ) / เหลืองอ่อน (เจล)
- ตารางใช้ **virtualized ไม่จำเป็น** (43 แถว) แต่ใช้ `content-visibility: auto` ช่วย scroll ลื่นบนมือถือ
- Summary bar: `fixed bottom-0` + `pb-[env(safe-area-inset-bottom)]` สำหรับ iPhone

---

## 5. Firestore Data Model + Security Rules

### Collection structure

```
users/{uid}/racePlans/{planId}
```

เลือกใช้ **subcollection ใต้ user** แทน top-level collection ที่มี `userId` field เพราะ:
- Security Rules เขียนง่ายและปลอดภัยกว่า (เช็คแค่ `request.auth.uid == uid` จาก path ไม่ต้องอ่าน document เพื่อเทียบ field)
- Query "แผนของฉันทั้งหมด" ไม่ต้อง `where` — ได้ scope ฟรีจาก path

### Document shape (`users/{uid}/racePlans/{planId}`)

```ts
// lib/firebase/plans.ts — TypeScript type ตรงกับ Firestore document

export interface RacePlanDoc {
  name: string;                 // "My Race Plan"
  raceDate: string | null;      // "2026-12-06" (ISO date) หรือ null
  startTime: string;            // "06:00" (HH:mm)
  distanceKm: number;           // 42.195
  defaultPaceSeconds: number;   // 360  (2:00–1800 วินาที)

  // เก็บเฉพาะ "ส่วนที่ user แก้" — ไม่เก็บ 43 แถวที่คำนวณได้ ลด doc size
  segmentOverrides: {
    index: number;              // 1..43
    overridePace: number | null;
    hasWater: boolean | null;   // null = ใช้ default rule (ทุก 2 กม.)
    hasGel: boolean | null;     // null = ใช้ default rule (ทุก 7 กม.)
    note: string | null;
  }[];

  createdAt: Timestamp;         // serverTimestamp()
  updatedAt: Timestamp;         // serverTimestamp()
}
```

### Client SDK access (`lib/firebase/plans.ts`)

```ts
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";

const plansCol = (uid: string) => collection(db, "users", uid, "racePlans");

export async function savePlan(uid: string, plan: Omit<RacePlanDoc, "createdAt" | "updatedAt">) {
  const ref = doc(plansCol(uid));
  await setDoc(ref, { ...plan, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updatePlan(uid: string, planId: string, plan: Partial<RacePlanDoc>) {
  await updateDoc(doc(plansCol(uid), planId), { ...plan, updatedAt: serverTimestamp() });
}

export async function listPlans(uid: string) {
  const snap = await getDocs(query(plansCol(uid), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RacePlanDoc) }));
}

export async function deletePlan(uid: string, planId: string) {
  await deleteDoc(doc(plansCol(uid), planId));
}
```

### Firestore Security Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid}/racePlans/{planId} {
      allow read, write: if request.auth != null
                          && request.auth.uid == uid;

      // กัน field ผิดชนิด/เกิน limit ตอน create หรือ update
      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.name is string
                    && request.resource.data.distanceKm is number
                    && request.resource.data.distanceKm > 0
                    && request.resource.data.distanceKm <= 1000
                    && request.resource.data.defaultPaceSeconds is number
                    && request.resource.data.defaultPaceSeconds >= 120
                    && request.resource.data.defaultPaceSeconds <= 1800
                    && request.resource.data.segmentOverrides.size() <= 60;
    }

    // ปิดทุกอย่างที่ไม่ match rule ด้านบน (default-deny)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**เหตุผลการออกแบบ:**
- **ไม่เก็บ 43 แถวเต็มใน Firestore** — เก็บแค่ config + `segmentOverrides` (เฉพาะแถวที่ user แก้) แล้ว rebuild ตารางฝั่ง client ด้วย `buildSegments()` → doc เล็ก, เขียนเร็ว, ไม่ผูกกับจำนวนกม.
- Path-based scoping (`users/{uid}/racePlans`) ทำให้ Security Rules สั้น ตรวจสอบง่าย และกัน user คนอื่นมาแก้/อ่านแผนกันไม่ได้ตั้งแต่ระดับ path
- ลบ user account (ผ่าน Cloud Function หรือ manual) → ลบ subcollection `racePlans` ตามได้ในสคริปต์เดียว
- Phase 2 ค่อยเพิ่ม top-level collection `sharedPlans/{token}` (public read, no auth) สำหรับฟีเจอร์ share link แบบ read-only

---

## 6. PWA Strategy

- **Manifest:** `display: standalone`, theme color ตาม dark/light, icons 192/512 + maskable
- **Service Worker:** precache app shell; แผนล่าสุด + draft เก็บใน `localStorage` → เปิดแอพกลางสนามแบบไม่มีเน็ตได้
- **Offline save queue:** ถ้ากด save ตอน offline → เก็บ pending ไว้ sync ตอน online กลับมา (Phase 2)

---

## 7. Roadmap การพัฒนา

| Step | งาน | ผลลัพธ์ |
|------|-----|---------|
| 1 | Scaffold: Next.js + Tailwind + shadcn/ui + dark mode | โปรเจกต์รันได้ |
| 2 | Pace engine + unit tests (vitest) | logic ถูกต้อง พิสูจน์ได้ |
| 3 | Planner UI: setup card + pacing table + stepper + summary bar | ใช้งานได้เต็มรูปแบบ (ยังไม่ save) |
| 4 | Hydration/Gel stations + override highlight | UX ครบตามโจทย์ |
| 5 | Firebase: Google Auth + Firestore rules + save/load + list plans | เก็บแผนได้ |
| 6 | PWA: manifest + service worker + offline draft | ติดตั้งลงมือถือได้ |
| 7 | Polish: animations, empty states, error handling | พร้อมใช้จริง |

---

## 8. คำถามที่รอคำตอบ

1. ~~ภาษา UI~~ → **ตอบแล้ว: English**
2. ~~Auth~~ → **ตอบแล้ว: Google Sign-In only**
3. ~~จุดน้ำ/เจล default~~ → **ตอบแล้ว: น้ำทุก 2 กม., เจลทุก 7 กม.**
4. **Firebase project** — มี project อยู่แล้วหรือให้ผม guide การสร้างใหม่ (Firebase Console → เปิด Authentication/Google provider + Firestore + คัดลอก config keys มาใส่ `.env.local`)?
