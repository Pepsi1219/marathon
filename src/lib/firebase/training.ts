import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./client";

// ── Race Goals ────────────────────────────────────────────────────────────────

export interface RaceGoalDoc {
  name: string;
  date: string;          // YYYY-MM-DD
  distanceKm: number;
  baseWeeklyKm: number;
  finishTime?: number | null;  // total seconds, user-entered after race
  createdAt: Timestamp | null;
}

export interface RaceGoalRecord extends RaceGoalDoc {
  id: string;
}

const racesCol = (uid: string) => collection(db, "users", uid, "raceGoals");

export async function addRaceGoal(
  uid: string,
  data: Omit<RaceGoalDoc, "createdAt">,
): Promise<RaceGoalRecord> {
  const ref = doc(racesCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data, createdAt: null };
}

export async function updateRaceGoal(
  uid: string,
  id: string,
  patch: { finishTime: number | null },
): Promise<void> {
  await updateDoc(doc(racesCol(uid), id), patch);
}

export async function deleteRaceGoal(uid: string, id: string) {
  await deleteDoc(doc(racesCol(uid), id));
}

export async function listRaceGoals(uid: string): Promise<RaceGoalRecord[]> {
  const snap = await getDocs(query(racesCol(uid), orderBy("date", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RaceGoalDoc) }));
}

// ── Activities ────────────────────────────────────────────────────────────────

export interface ActivityDoc {
  date: string;          // YYYY-MM-DD
  distanceKm: number;
  durationSec: number | null;
  note: string | null;
  createdAt: Timestamp | null;
}

export interface ActivityRecord extends ActivityDoc {
  id: string;
}

const activitiesCol = (uid: string) => collection(db, "users", uid, "activities");

export async function addActivity(
  uid: string,
  data: Omit<ActivityDoc, "createdAt">,
): Promise<ActivityRecord> {
  const ref = doc(activitiesCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data, createdAt: null };
}

export async function deleteActivity(uid: string, id: string) {
  await deleteDoc(doc(activitiesCol(uid), id));
}

export async function listActivities(uid: string): Promise<ActivityRecord[]> {
  const snap = await getDocs(query(activitiesCol(uid), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ActivityDoc) }));
}

// ── Weekly Target Overrides ───────────────────────────────────────────────────

export interface WeeklyTargetDoc {
  plannedKm: number;
}

export interface WeeklyTargetRecord extends WeeklyTargetDoc {
  weekKey: string; // YYYY-Www
}

const targetsCol = (uid: string) => collection(db, "users", uid, "weeklyTargets");

export async function setWeeklyTarget(uid: string, weekKey: string, plannedKm: number) {
  await setDoc(doc(targetsCol(uid), weekKey), { plannedKm });
}

export async function deleteWeeklyTarget(uid: string, weekKey: string) {
  await deleteDoc(doc(targetsCol(uid), weekKey));
}

export async function listWeeklyTargets(uid: string): Promise<WeeklyTargetRecord[]> {
  const snap = await getDocs(targetsCol(uid));
  return snap.docs.map((d) => ({ weekKey: d.id, plannedKm: (d.data() as WeeklyTargetDoc).plannedKm }));
}
