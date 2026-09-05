// Server-only: this module constructs the Anthropic client and must never be
// imported into a client component. The API key stays on the server.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type {
  Analysis,
  Capability,
  Degree,
  Role,
  StudentProfile,
  Unit,
} from "@/lib/types";

const MODEL = "claude-opus-5";

const client = new Anthropic();

/* ------------------------------------------------------------- schemas -- */

const CapabilitySchema = z.object({
  id: z.string().describe("short kebab-case id, unique within the response"),
  name: z.string().describe("the capability, named as industry would name it"),
  category: z.enum(["language", "tool", "practice", "domain", "foundation"]),
  importance: z.enum(["core", "common", "nice-to-have"]),
  status: z.enum(["evidenced", "partial", "gap"]),
  evidence: z
    .array(
      z.object({
        unitCode: z.string().describe("MUST be a unit code from the student's list"),
        unitTitle: z.string(),
        quote: z
          .string()
          .describe("short phrase from that unit's supplied description that supports the match"),
      }),
    )
    .describe("empty for a gap; one or more entries for evidenced or partial"),
  rationale: z.string().describe("one sentence, plain English, addressed to the student"),
});

const GapSchema = z.object({
  headline: z
    .string()
    .describe("one sentence summarising where this student stands for this role"),
  capabilities: z.array(CapabilitySchema),
});

const RoadmapSchema = z.object({
  headline: z.string().describe("one sentence framing the plan"),
  stageNote: z
    .string()
    .describe(
      "one sentence naming explicitly why this plan suits a student at THIS stage, and how it would differ at another stage",
    ),
  semesters: z.array(
    z.object({
      label: z.string().describe('e.g. "Year 2, Semester 1"'),
      focus: z.string().describe("a few words: the theme of this semester"),
      steps: z.array(
        z.object({
          id: z.string(),
          title: z.string().describe("concrete and specific; not 'learn cloud'"),
          type: z.enum(["learn", "build", "ship", "connect"]),
          effort: z.enum(["light", "moderate", "substantial"]),
          addressesCapabilityIds: z.array(z.string()),
          buildsOnUnitCodes: z
            .array(z.string())
            .describe("units this leans on; MUST come from the student's list; may be empty"),
          rationale: z.string().describe("one sentence: why this, why now"),
        }),
      ),
    }),
  ),
});

/* -------------------------------------------------------------- prompts -- */

const GAP_SYSTEM = `You map a university student's completed coursework onto what a role actually requires.

You are given a role profile (drawn from O*NET and Australian job-ad data) and a list of units the student has completed, each with the university's own description of its content.

Your job is the semantic join. "Algorithms and Data Structures" is not a string match for "strong DSA fundamentals", but it is the same competency, and saying so is the entire point of this product.

Rules, in order of importance:

1. GROUND EVERYTHING. Every piece of evidence must cite a unit from the student's supplied list and quote a phrase from that unit's supplied description. If you cannot ground a claim in the supplied text, mark the capability a gap. Never infer what a unit contains from its code or title alone when a description is supplied. Never invent a unit.
2. BE HONEST ABOUT PARTIALS. A unit that touches a topic in one lecture is "partial", not "evidenced". Coursework rarely demonstrates production practice: writing code in an assignment is not the same as version control, deployment or testing discipline. This distinction is the product's credibility.
3. COVER WHAT MATTERS. Return 12-18 capabilities spanning the role: languages, tools, practices and domain knowledge. Prioritise things flagged as in-demand. Do not pad with trivia.
4. WRITE FOR THE STUDENT. Rationales are one plain sentence, addressed to them, no jargon and no cheerleading. Many readers are reading in a second language.
5. NEVER JUDGE THE PERSON. Assess coursework against requirements. Do not comment on aptitude, and do not use the student's name, background or country in any reasoning.`;

const ROADMAP_SYSTEM = `You turn a skills gap into a realistic plan across the semesters a student has left.

The single most important input is how much time they have. The same gap produces a very different plan for a first-year with six semesters and a final-year with one, and getting that difference right is the product's core claim.

Rules:

1. TIME DRIVES EVERYTHING.
   - Many semesters left: light load per semester, foundations first, habits that compound, breadth before depth. Two or three steps per semester at most. Their advantage is time, so spend it on things that only pay off with time.
   - One or two semesters left: triage. Only what makes them credible for the roles they are applying to now. Drop foundations they can no longer complete. Say plainly what is being left out and why.
2. BUILD ON WHAT THEY JUST DID. Prefer steps that extend a unit they have completed, and name it. "You just finished Databases, so build X on top of it while it is fresh" is the recommendation students actually act on.
3. BE CONCRETE. "Build a REST API that serves the dataset from your data processing unit and deploy it" — not "learn backend development". A step should be startable this week.
4. SEQUENCE HONESTLY. Do not schedule something that depends on a step in a later semester.
5. INCLUDE ONE 'connect' STEP overall, appropriate to stage: early students get low-stakes student-facing events, late students get industry rooms where hiring happens.
6. NEVER RECOMMEND MORE THAN A STUDENT CAN DO alongside a full study load. An overwhelming plan is a plan nobody starts.
7. Address gaps and partials, not things already evidenced.`;

/* ------------------------------------------------------- prompt bodies -- */

function roleCorpus(role: Role): string {
  const tech = role.technologies
    .slice(0, 70)
    .map((t) => `- ${t.name} (${t.category})${t.hot ? " [in demand]" : ""}`)
    .join("\n");
  const tasks = role.coreTasks.map((t) => `- ${t}`).join("\n");
  const skills = role.essentialSkills
    .map((s) => `- ${s.name} (importance ${s.importance}/5)`)
    .join("\n");

  const d = role.demand;
  const demand = d
    ? `Australian demand (Jobs and Skills Australia Internet Vacancy Index, ${d.latestMonth}):
- ${d.latestAds} online job ads nationally, against a historic peak of ${d.peakAds}
- year on year: ${d.yearOnYearPct}%
- mapped to ANZSCO ${role.anzscoCode} "${d.anzscoTitle}" (${role.mappingConfidence} confidence: ${role.mappingNote})`
    : "Australian demand data unavailable for this role.";

  return `# TARGET ROLE: ${role.title}

${role.description}

## Core tasks (O*NET ${role.onetCode})
${tasks}

## Technologies employers ask for
${tech}

## Skills, employer-rated
${skills}

## ${demand}`;
}

function studentBrief(
  profile: StudentProfile,
  degree: Degree | null,
  units: Unit[],
): string {
  const unitText = units.length
    ? units
        .map(
          (u) =>
            `### ${u.code} — ${u.title}${u.level ? ` (${u.level})` : ""}\n${
              u.description || "[no description supplied — match on title only, and be cautious]"
            }${u.learningOutcomes ? `\nOutcomes: ${u.learningOutcomes}` : ""}`,
        )
        .join("\n\n")
    : "The student has not listed any completed units.";

  const manual = profile.manualUnits.length
    ? `\n\nUnits the student typed in themselves (no description available — match on title only, and be cautious):\n${profile.manualUnits
        .map((u) => `- ${u.code} ${u.title}`)
        .join("\n")}`
    : "";

  const resume = profile.resumeSkills.length
    ? `\n\nSkills and experience they listed: ${profile.resumeSkills.join(", ")}`
    : "";

  return `# THE STUDENT

Degree: ${degree ? `${degree.name}, ${degree.institution}` : "not specified"}
Stage: year ${profile.yearLevel}, with ${profile.semestersRemaining} semester${
    profile.semestersRemaining === 1 ? "" : "s"
  } remaining before graduation
Location: ${profile.city}${resume}

## Units completed
${unitText}${manual}`;
}

/* ------------------------------------------------------------ grounding -- */

/**
 * The hallucination control, enforced in code rather than trusted to the prompt.
 * `prd.md` §8 commits to recommendations grounded in retrieved data; anything
 * citing a unit the student never listed is dropped, not displayed.
 */
function enforceGrounding(
  capabilities: Capability[],
  validUnitCodes: Set<string>,
): { kept: Capability[]; dropped: number } {
  let dropped = 0;
  const kept = capabilities.map((c) => {
    const evidence = c.evidence.filter((e) => validUnitCodes.has(e.unitCode.toUpperCase()));
    dropped += c.evidence.length - evidence.length;
    // Losing every citation demotes the claim rather than deleting the row:
    // the requirement is still real, we just cannot say they have covered it.
    const status = evidence.length === 0 && c.status !== "gap" ? "gap" : c.status;
    return { ...c, evidence, status };
  });
  return { kept, dropped };
}

/* ---------------------------------------------------------------- calls -- */

export async function analyse(
  profile: StudentProfile,
  role: Role,
  degree: Degree | null,
  units: Unit[],
): Promise<Analysis> {
  const corpus = roleCorpus(role);
  const brief = studentBrief(profile, degree, units);

  // Cache breakpoint sits after the role corpus: identical for every student
  // targeting this role, while the brief below it changes per student.
  const gap = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: GAP_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: corpus, cache_control: { type: "ephemeral" } },
          { type: "text", text: `${brief}\n\nProduce the capability map.` },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(GapSchema) },
  });

  const parsedGap = gap.parsed_output;
  if (!parsedGap) throw new Error("Gap analysis returned no structured output");

  const validCodes = new Set(
    [...units.map((u) => u.code), ...profile.manualUnits.map((u) => u.code)].map((c) =>
      c.toUpperCase(),
    ),
  );
  const { kept, dropped } = enforceGrounding(
    parsedGap.capabilities as Capability[],
    validCodes,
  );

  const outstanding = kept.filter((c) => c.status !== "evidenced");

  const roadmap = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // The sequencing call is the one genuinely hard reasoning step: it has to
    // trade off breadth against the time actually available.
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: ROADMAP_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: corpus, cache_control: { type: "ephemeral" } },
          {
            type: "text",
            text: `${brief}

## Capabilities still outstanding
${outstanding
  .map(
    (c) =>
      `- [${c.id}] ${c.name} (${c.importance}, currently ${c.status}) — ${c.rationale}`,
  )
  .join("\n")}

Produce a plan covering exactly ${profile.semestersRemaining} semester${
              profile.semestersRemaining === 1 ? "" : "s"
            }, starting from their next one.`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(RoadmapSchema) },
  });

  const parsedRoadmap = roadmap.parsed_output;
  if (!parsedRoadmap) throw new Error("Roadmap returned no structured output");

  return {
    gap: { headline: parsedGap.headline, capabilities: kept },
    roadmap: parsedRoadmap,
    grounding: {
      roleId: role.id,
      unitCodes: [...validCodes],
      droppedUngrounded: dropped,
    },
  };
}
