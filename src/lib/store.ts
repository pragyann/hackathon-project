"use client";

import { useSyncExternalStore } from "react";

import type { Analysis, StudentProfile } from "@/lib/types";

/**
 * Where the student's profile lives.
 *
 * `open-questions.md` §7 weighed real persistence against session-only and leaned
 * session-only, on the grounds that the semester loop can be told honestly from
 * pre-seeded profiles for a fraction of the build cost. We keep the profile in the
 * browser instead: the resume and transcript are personal information under the
 * Australian Privacy Act (`prd.md` §8 commits to collecting only what the
 * recommendations need and to offering a delete path), and the strongest version
 * of that promise is that the data never reaches our server at rest at all.
 *
 * The profile is posted to the server to be analysed and is not stored there.
 * Everything here sits behind one small interface so that swapping in a database
 * for the P1 semester-rollover feature touches this file only.
 */

const PROFILE_KEY = "onramp.profile.v1";
const ANALYSIS_KEY = "onramp.analysis.v1";

export const emptyProfile: StudentProfile = {
  name: "",
  degreeId: "",
  yearLevel: 1,
  semestersRemaining: 6,
  city: "Melbourne",
  completedUnitCodes: [],
  manualUnits: [],
  resumeSkills: [],
  targetRoleId: null,
  exploring: false,
  classBlocks: [],
  eventPlans: [],
};

/** Profiles saved before a field existed come back without it. */
function normalizeProfile(p: StudentProfile | null): StudentProfile | null {
  if (!p) return null;
  return { ...emptyProfile, ...p };
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Same-tab change signal: `storage` only fires in OTHER tabs, and the plan
    page now writes progressively while mounted. */
const CHANGE_EVENT = "onramp:store";
function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    announce();
  } catch {
    /* quota or private mode — the app still works, it just will not resume */
  }
}

export const loadProfile = () => normalizeProfile(read<StudentProfile>(PROFILE_KEY));
export const saveProfile = (p: StudentProfile) => write(PROFILE_KEY, p);

export const loadAnalysis = () => read<Analysis>(ANALYSIS_KEY);
export const saveAnalysis = (a: Analysis) => write(ANALYSIS_KEY, a);
export function clearAnalysis() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ANALYSIS_KEY);
  announce();
}

/* --------------------------------------------------------------- hooks -- */

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * localStorage is an external store, so read it with the primitive built for
 * external stores. Parsing on every render would return a new object each time
 * and spin useSyncExternalStore forever, so snapshots are memoised against the
 * raw string and only re-parsed when it actually changes.
 */
function makeSnapshotReader<T>(key: string) {
  let lastRaw: string | null = null;
  let lastValue: T | null = null;
  return () => {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    if (raw !== lastRaw) {
      lastRaw = raw;
      try {
        lastValue = raw ? (JSON.parse(raw) as T) : null;
      } catch {
        lastValue = null;
      }
      if (lastValue && key === PROFILE_KEY) {
        lastValue = normalizeProfile(lastValue as unknown as StudentProfile) as unknown as T;
      }
    }
    return lastValue;
  };
}

const profileSnapshot = makeSnapshotReader<StudentProfile>(PROFILE_KEY);
const analysisSnapshot = makeSnapshotReader<Analysis>(ANALYSIS_KEY);
const serverSnapshot = () => null;

/**
 * True only once the client has hydrated. Both stored values read as null on the
 * server, so without this the page would flash "no plan yet" before localStorage
 * is readable.
 */
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useStoredProfile() {
  return useSyncExternalStore(subscribe, profileSnapshot, serverSnapshot);
}

export function useStoredAnalysis() {
  return useSyncExternalStore(subscribe, analysisSnapshot, serverSnapshot);
}

/** The delete path prd.md §8 commits to. One click, everything gone. */
export function clearEverything() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(ANALYSIS_KEY);
  announce();
}
