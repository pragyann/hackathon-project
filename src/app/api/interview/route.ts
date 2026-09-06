import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { roleCorpus } from "@/lib/ai/analyse";
import { getRole } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 90;

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

import { ARCHETYPES, type ArchetypeId } from "@/lib/interview";

const INTERVIEW_SYSTEM = `You are a realistic job interviewer running a MOCK interview inside Onramp, a career tool for university students. The candidate is a student practising — the point is realistic practice with honest, useful pressure, never humiliation.

Rules:

1. ONE QUESTION PER TURN. Ask it, then stop. No multi-part question dumps. React briefly (one sentence) to their previous answer first — a real interviewer acknowledges what they heard.
2. GROUND EVERY TECHNICAL QUESTION in the role profile supplied (tasks, technologies, skills) and, when a job ad is supplied, in that ad above all. Never invent facts about a specific company. You are an archetype, not a named employer.
3. CALIBRATE TO A STUDENT. This is a graduate/junior-level interview. Fundamentals, projects, coursework, reasoning — not system-design trivia for staff engineers.
4. FOLLOW THE ARC: warm greeting and one opener → one behavioural question → two or three technical questions grounded in the role → one scenario question → ask if they have questions for you, then wrap up. Roughly 6-7 interviewer turns total.
5. PRESS ONCE, KINDLY. If an answer is vague, follow up once for specifics ("what did you build it with?"), then move on.
6. NEVER JUDGE THE PERSON, never reference name, background, accent or nationality. Assess answers only.
7. Speak naturally in first person, as if aloud. No markdown, no lists — this text may be read out by a voice.`;

const DebriefSchema = z.object({
  overall: z.string().describe("3-4 sentences: honest overall read, addressed to the student"),
  strengths: z.array(z.string()).describe("2-4 specific things that worked, each citing what they said"),
  improvements: z
    .array(
      z.object({
        point: z.string().describe("what to improve"),
        example: z.string().describe("how their actual answer could have been stronger"),
      }),
    )
    .describe("2-4 items"),
  practiseNext: z.string().describe("the single most valuable thing to practise before a real interview"),
});

type InterviewRequest = {
  roleId: string;
  archetype: ArchetypeId;
  jobAd?: string;
  candidate: { yearLevel: number; unitCodes: string[] };
  transcript: { speaker: "interviewer" | "candidate"; text: string }[];
  action: "next" | "debrief";
};

export async function POST(request: Request) {
  let body: InterviewRequest;
  try {
    body = (await request.json()) as InterviewRequest;
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const role = getRole(body.roleId);
  if (!role) return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  const archetype = ARCHETYPES[body.archetype] ?? ARCHETYPES.enterprise;

  const jobAd = (body.jobAd ?? "").trim().slice(0, 8000);
  const setup = `${roleCorpus(role)}

# INTERVIEW SETUP

Interviewer archetype: ${archetype.label}. ${archetype.style}
${jobAd ? `\nThe candidate pasted this real job ad. Treat it as the authoritative description of the role and prioritise its stated responsibilities:\n"""\n${jobAd}\n"""\n` : ""}
# THE CANDIDATE (a practising student)

Year ${body.candidate?.yearLevel ?? "?"} university student. Units completed: ${
    body.candidate?.unitCodes?.join(", ") || "not stated"
  }. Calibrate to graduate/junior level.`;

  // interviewer speaks as assistant; candidate as user
  const history = (body.transcript ?? []).slice(-30).map((t) => ({
    role: t.speaker === "interviewer" ? ("assistant" as const) : ("user" as const),
    content: t.text,
  }));

  try {
    if (body.action === "debrief") {
      const debrief = await client.messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: "You are a supportive interview coach. You are given a mock-interview transcript. Assess the CANDIDATE's answers honestly and specifically, quoting or paraphrasing what they actually said. Junior/graduate calibration. Never judge the person, only the answers.",
          },
        ],
        messages: [
          {
            role: "user",
            content: `${setup}\n\n# TRANSCRIPT\n\n${(body.transcript ?? [])
              .map((t) => `${t.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`)
              .join("\n\n")}\n\nProduce the debrief.`,
          },
        ],
        output_config: { format: zodOutputFormat(DebriefSchema) },
      });
      if (!debrief.parsed_output) throw new Error("Debrief returned no structured output");
      return NextResponse.json({ debrief: debrief.parsed_output });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: [{ type: "text", text: INTERVIEW_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user" as const, content: `${setup}\n\nBegin (or continue) the interview now.` },
        ...(history.length && history[0].role === "assistant"
          ? history
          : history.length
            ? [{ role: "assistant" as const, content: "(interview underway)" }, ...history]
            : []),
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ turn: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[interview]", error);
    return NextResponse.json({ error: `The interview engine failed: ${message}` }, { status: 502 });
  }
}
