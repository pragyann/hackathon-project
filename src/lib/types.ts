/** Domain types. Kept in one file so the data contract is readable in one sitting. */

export type Unit = {
  code: string;
  title: string;
  level: string;
  points: number | null;
  description: string;
  learningOutcomes: string;
  source: string;
  yearLevel: number;
  kind: "core" | "elective";
};

export type Degree = {
  id: string;
  institution: string;
  name: string;
  durationYears: number;
  units: Unit[];
};

export type RoleDemand = {
  anzscoTitle: string;
  latestMonth: string;
  latestAds: number | null;
  peakAds: number | null;
  peakIsHistoric: boolean;
  yearOnYearPct: number | null;
  byState: Record<string, number>;
  trend: number[];
};

export type Role = {
  id: string;
  title: string;
  onetCode: string;
  onetTitle: string;
  description: string;
  anzscoCode: string;
  mappingConfidence: "high" | "medium" | "low";
  mappingNote: string;
  coreTasks: string[];
  technologies: { name: string; category: string; hot: boolean; inDemand: boolean }[];
  essentialSkills: { name: string; importance: number }[];
  demand: RoleDemand | null;
};

export type NetworkingEvent = {
  id: string;
  name: string;
  organiser: string;
  url: string;
  city: string;
  venue: string;
  cadence: string;
  cost: "free" | "paid" | "varies";
  format: "in-person" | "online" | "hybrid";
  /** Who the room is actually for. Drives stage-appropriateness ranking. */
  audience: ("student" | "early-career" | "practitioner" | "senior")[];
  topics: string[];
  description: string;
  /** From the organiser's public listing where stated; null when unknown. */
  memberCount: number | null;
};

/* ------------------------------------------------------------- student -- */

export type StudentProfile = {
  name: string;
  degreeId: string;
  /** 1-indexed year of study. The input that makes the roadmap stage-aware. */
  yearLevel: number;
  semestersRemaining: number;
  city: string;
  completedUnitCodes: string[];
  /** Free-text units a student typed in themselves, for degrees we have not seeded. */
  manualUnits: { code: string; title: string }[];
  resumeSkills: string[];
  targetRoleId: string | null;
  /** Set when the student chose "I'm not sure yet" and is exploring. */
  exploring: boolean;
};

/* -------------------------------------------------------- analysis out -- */

export type CapabilityStatus = "evidenced" | "partial" | "gap";

export type Capability = {
  id: string;
  name: string;
  category: "language" | "tool" | "practice" | "domain" | "foundation";
  importance: "core" | "common" | "nice-to-have";
  status: CapabilityStatus;
  /** Must reference a unit the student actually listed. Ungrounded rows are dropped. */
  evidence: { unitCode: string; unitTitle: string; quote: string }[];
  rationale: string;
};

export type GapAnalysis = {
  capabilities: Capability[];
  headline: string;
};

export type RoadmapStep = {
  id: string;
  title: string;
  type: "learn" | "build" | "ship" | "connect";
  effort: "light" | "moderate" | "substantial";
  addressesCapabilityIds: string[];
  buildsOnUnitCodes: string[];
  rationale: string;
};

export type RoadmapSemester = {
  label: string;
  focus: string;
  steps: RoadmapStep[];
};

export type Roadmap = {
  headline: string;
  stageNote: string;
  semesters: RoadmapSemester[];
};

export type Analysis = {
  gap: GapAnalysis;
  /** Null while the sequencing call is still running — the gap renders first. */
  roadmap: Roadmap | null;
  /** Recorded so the UI can show what the recommendation was grounded in. */
  grounding: {
    roleId: string;
    unitCodes: string[];
    droppedUngrounded: number;
  };
  /** True for the shipped worked examples, and said so in the UI. */
  precomputed?: boolean;
};
