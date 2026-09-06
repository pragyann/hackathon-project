/**
 * Employer archetypes rather than named companies, deliberately: we will not
 * fabricate claims about a real company's interview process. When the student
 * pastes a real job ad, THAT becomes the authoritative source about the role.
 */
export const ARCHETYPES = {
  enterprise: {
    label: "Enterprise graduate program",
    blurb: "A bank, telco or insurer. Structured, behavioural-heavy, fundamentals over frameworks.",
    style:
      "A structured graduate-program interview at a large Australian enterprise (a bank, telco or insurer). Formal but kind. Strict behavioural structure (STAR), fundamentals over frameworks, one question about working in a large regulated organisation.",
  },
  startup: {
    label: "Product startup",
    blurb: "Small Melbourne product team. Direct, practical, digs into what you have actually built.",
    style:
      "An interview at a small Melbourne product startup. Conversational and direct. Cares about what the candidate has actually built, how they learn fast, and whether they can ship with little supervision. Digs into any project mentioned.",
  },
  consultancy: {
    label: "Technology consultancy",
    blurb: "Client-facing work. Clear explanations matter as much as code.",
    style:
      "An interview at a technology consultancy. Client communication matters as much as code: expects clear explanations a non-technical client could follow, and one scenario about handling a difficult stakeholder.",
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPES;

export type InterviewTurn = { speaker: "interviewer" | "candidate"; text: string };

export type Debrief = {
  overall: string;
  strengths: string[];
  improvements: { point: string; example: string }[];
  practiseNext: string;
};
