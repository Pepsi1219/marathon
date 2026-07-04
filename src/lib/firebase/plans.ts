import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./client";
import { buildSegments, type KmSegment, type RaceConfig } from "@/lib/pace-engine";
import { toSegmentOverrides, applySegmentOverrides, type SegmentOverride } from "./segment-overrides";

export { toSegmentOverrides, applySegmentOverrides, type SegmentOverride };

export interface RacePlanDoc {
  name: string;
  raceDate: string | null;
  startTime: string;
  distanceKm: number;
  defaultPaceSeconds: number;
  waterEveryKm: number;
  gelEveryKm: number;
  segmentOverrides: SegmentOverride[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface RacePlanRecord extends RacePlanDoc {
  id: string;
}

const plansCol = (uid: string) => collection(db, "users", uid, "racePlans");

export async function savePlan(
  uid: string,
  name: string,
  config: RaceConfig,
  segments: KmSegment[],
  waterEveryKm: number,
  gelEveryKm: number,
): Promise<string> {
  const defaults = buildSegments(config.totalDistanceKm, { waterEveryKm, gelEveryKm });
  const ref = doc(plansCol(uid));
  await setDoc(ref, {
    name,
    raceDate: null,
    startTime: config.startTime,
    distanceKm: config.totalDistanceKm,
    defaultPaceSeconds: config.defaultPace,
    waterEveryKm,
    gelEveryKm,
    segmentOverrides: toSegmentOverrides(segments, defaults),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlan(
  uid: string,
  planId: string,
  name: string,
  config: RaceConfig,
  segments: KmSegment[],
  waterEveryKm: number,
  gelEveryKm: number,
) {
  const defaults = buildSegments(config.totalDistanceKm, { waterEveryKm, gelEveryKm });
  await updateDoc(doc(plansCol(uid), planId), {
    name,
    startTime: config.startTime,
    distanceKm: config.totalDistanceKm,
    defaultPaceSeconds: config.defaultPace,
    waterEveryKm,
    gelEveryKm,
    segmentOverrides: toSegmentOverrides(segments, defaults),
    updatedAt: serverTimestamp(),
  });
}

export async function listPlans(uid: string): Promise<RacePlanRecord[]> {
  const snap = await getDocs(query(plansCol(uid), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RacePlanDoc) }));
}

export async function deletePlan(uid: string, planId: string) {
  await deleteDoc(doc(plansCol(uid), planId));
}

export async function getPlan(uid: string, planId: string): Promise<RacePlanRecord | null> {
  const snap = await getDoc(doc(plansCol(uid), planId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as RacePlanDoc) } : null;
}
