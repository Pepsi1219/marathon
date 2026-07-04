"use client";

import { useMemo, useReducer } from "react";
import {
  adjustPace,
  buildSegments,
  computeSplits,
  summarize,
  type KmSegment,
  type RaceConfig,
} from "@/lib/pace-engine";

interface RacePlanState {
  config: RaceConfig;
  segments: KmSegment[];
  waterEveryKm: number;
  gelEveryKm: number;
}

type RacePlanAction =
  | { type: "SET_START_TIME"; startTime: string }
  | { type: "SET_DEFAULT_PACE"; pace: number }
  | { type: "SET_DISTANCE"; km: number }
  | { type: "SET_STATION_INTERVALS"; waterEveryKm: number; gelEveryKm: number }
  | { type: "NUDGE_SEGMENT_PACE"; index: number; deltaSeconds: number }
  | { type: "SET_SEGMENT_PACE"; index: number; pace: number | null }
  | { type: "RESET_SEGMENT"; index: number }
  | { type: "TOGGLE_WATER"; index: number }
  | { type: "TOGGLE_GEL"; index: number }
  | { type: "LOAD_PLAN"; config: RaceConfig; segments: KmSegment[] };

function reducer(state: RacePlanState, action: RacePlanAction): RacePlanState {
  switch (action.type) {
    case "SET_START_TIME":
      return { ...state, config: { ...state.config, startTime: action.startTime } };

    case "SET_DEFAULT_PACE":
      return { ...state, config: { ...state.config, defaultPace: action.pace } };

    case "SET_DISTANCE": {
      const segments = buildSegments(action.km, {
        waterEveryKm: state.waterEveryKm,
        gelEveryKm: state.gelEveryKm,
      });
      return { ...state, config: { ...state.config, totalDistanceKm: action.km }, segments };
    }

    case "SET_STATION_INTERVALS": {
      const segments = buildSegments(state.config.totalDistanceKm, {
        waterEveryKm: action.waterEveryKm,
        gelEveryKm: action.gelEveryKm,
      }).map((seg) => {
        const existing = state.segments.find((s) => s.index === seg.index);
        return existing ? { ...seg, overridePace: existing.overridePace, note: existing.note } : seg;
      });
      return { ...state, waterEveryKm: action.waterEveryKm, gelEveryKm: action.gelEveryKm, segments };
    }

    case "NUDGE_SEGMENT_PACE":
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.index === action.index
            ? { ...seg, overridePace: adjustPace(seg.overridePace ?? state.config.defaultPace, action.deltaSeconds) }
            : seg,
        ),
      };

    case "SET_SEGMENT_PACE":
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.index === action.index ? { ...seg, overridePace: action.pace } : seg,
        ),
      };

    case "RESET_SEGMENT":
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.index === action.index ? { ...seg, overridePace: null } : seg,
        ),
      };

    case "TOGGLE_WATER":
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.index === action.index ? { ...seg, hasWater: !seg.hasWater } : seg,
        ),
      };

    case "TOGGLE_GEL":
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.index === action.index ? { ...seg, hasGel: !seg.hasGel } : seg,
        ),
      };

    case "LOAD_PLAN":
      return { ...state, config: action.config, segments: action.segments };

    default:
      return state;
  }
}

const DEFAULT_CONFIG: RaceConfig = {
  startTime: "06:00",
  totalDistanceKm: 42.195,
  defaultPace: 360,
};

export function useRacePlan(initial?: Partial<RacePlanState>) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const config = { ...DEFAULT_CONFIG, ...initial?.config };
    const waterEveryKm = initial?.waterEveryKm ?? 2;
    const gelEveryKm = initial?.gelEveryKm ?? 7;
    return {
      config,
      waterEveryKm,
      gelEveryKm,
      segments: initial?.segments ?? buildSegments(config.totalDistanceKm, { waterEveryKm, gelEveryKm }),
    };
  });

  const splits = useMemo(() => computeSplits(state.config, state.segments), [state.config, state.segments]);
  const summary = useMemo(() => summarize(state.config, splits), [state.config, splits]);

  return { state, splits, summary, dispatch };
}
