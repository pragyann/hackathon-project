import rolesJson from "@/data/roles.json";
import degreesJson from "@/data/degrees.json";
import eventsJson from "@/data/events.json";

import type {
  Capability,
  Degree,
  NetworkingEvent,
  Role,
  StudentProfile,
  Unit,
} from "@/lib/types";

export const roles = rolesJson.roles as unknown as Role[];
export const degrees = degreesJson.degrees as unknown as Degree[];
export const events = eventsJson.events as unknown as NetworkingEvent[];

export const sources = {
  roles: rolesJson.generatedFrom,
  degrees: degreesJson.source,
  events: eventsJson.source,
};

export const getRole = (id: string | null) => roles.find((r) => r.id === id) ?? null;
export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getDegree = (id: string | null) => degrees.find((d) => d.id === id) ?? null;

export function unitsFor(profile: StudentProfile): Unit[] {
  const degree = getDegree(profile.degreeId);
  if (!degree) return [];
  const wanted = new Set(profile.completedUnitCodes.map((c) => c.toUpperCase()));
  return degree.units.filter((u) => wanted.has(u.code.toUpperCase()));
}

/* --------------------------------------------------------- event ranking -- */

export type RankedEvent = {
  event: NetworkingEvent;
  score: number;
  /** Every reason that contributed, shown verbatim in the UI. P0-7. */
  reasons: string[];
  /** Points per scoring term, aligned 1:1 with `reasons` for the score anatomy UI. */
  contributions: { label: string; points: number }[];
  /** Named so the student can see the judgement, not just the ranking. */
  stageFit: "ideal" | "reachable" | "advanced";
};

/**
 * Deterministic, and deliberately so. `prd.md` §5.3 wants each recommendation to
 * show why it surfaced; a scoring function whose terms are the reasons does that
 * exactly, costs nothing to run, and cannot hallucinate an event.
 */
export function rankEvents(
  profile: StudentProfile,
  role: Role | null,
  outstanding: Capability[] = [],
): RankedEvent[] {
  // Stage drives appropriateness. prd.md §5.3: a first-year sent to a senior
  // architects' dinner has a bad time and never goes to another event, which is
  // a worse outcome than recommending nothing.
  const early = profile.yearLevel <= 2 || profile.semestersRemaining >= 4;

  const roleTopics = new Set(
    [
      ...(role?.technologies.slice(0, 40).map((t) => t.name) ?? []),
      ...(role?.title.split(/\s+/) ?? []),
    ].map((t) => t.toLowerCase()),
  );
  const gapTerms = outstanding.map((c) => c.name.toLowerCase());

  const ranked = events.map((event): RankedEvent => {
    const reasons: string[] = [];
    // Each entry pairs with reasons[i], so the UI can show points beside prose.
    const contributions: RankedEvent["contributions"] = [];
    let score = 0;

    if (event.city.toLowerCase() === profile.city.toLowerCase()) {
      score += 20;
      reasons.push(`In ${event.city}, where you are studying`);
      contributions.push({ label: "In Melbourne", points: 20 });
    }

    // Topic relevance to the target role.
    const topicHit = event.topics.filter((t) =>
      [...roleTopics].some((r) => r.includes(t) || t.includes(r)),
    );
    if (topicHit.length) {
      score += 12 * topicHit.length;
      reasons.push(
        `Covers ${topicHit.slice(0, 3).join(", ")}, which ${
          role ? `${role.title} roles ask for` : "your target roles ask for"
        }`,
      );
      contributions.push({ label: "Role topics", points: 12 * topicHit.length });
    }

    // Relevance to what the roadmap says is still missing. This is the signal a
    // generic event site cannot produce, because it does not know the roadmap.
    const gapHit = event.topics.filter((t) =>
      gapTerms.some((g) => g.includes(t) || t.includes(g)),
    );
    if (gapHit.length) {
      score += 18 * gapHit.length;
      reasons.push(`Directly relevant to a gap on your roadmap: ${gapHit.slice(0, 2).join(", ")}`);
      contributions.push({ label: "Gap relevance", points: 18 * gapHit.length });
    }

    // Stage appropriateness.
    const isStudentFriendly =
      event.audience.includes("student") || event.audience.includes("early-career");
    const isSenior = event.audience.includes("senior") && !isStudentFriendly;

    let stageFit: RankedEvent["stageFit"] = "reachable";
    if (early && isStudentFriendly) {
      score += 28;
      stageFit = "ideal";
      reasons.push("Welcomes students and beginners, so a good first room to walk into");
      contributions.push({ label: "Stage fit", points: 28 });
    } else if (early && isSenior) {
      score -= 25;
      stageFit = "advanced";
      reasons.push("Aimed at experienced practitioners — worth knowing about, but not your first event");
      contributions.push({ label: "Stage fit", points: -25 });
    } else if (!early && event.audience.includes("practitioner")) {
      score += 26;
      stageFit = "ideal";
      reasons.push("The people in this room are the people who hire for the roles you are applying to");
      contributions.push({ label: "Stage fit", points: 26 });
    } else if (!early && isStudentFriendly && !event.audience.includes("practitioner")) {
      score += 6;
      reasons.push("Beginner-focused — useful, though you are past the introductory stage");
      contributions.push({ label: "Stage fit", points: 6 });
    }

    if (event.cost === "free") {
      score += 8;
      reasons.push("Free to attend");
      contributions.push({ label: "Free", points: 8 });
    }

    if (event.memberCount && event.memberCount > 2000) {
      score += 5;
      reasons.push(`An established community (${event.memberCount.toLocaleString("en-AU")} members)`);
      contributions.push({ label: "Community size", points: 5 });
    }

    return { event, score, reasons, contributions, stageFit };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
