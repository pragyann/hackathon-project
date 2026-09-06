import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const COPILOT_SYSTEM = `You are the Onramp copilot — a concise career-plan concierge for ONE student whose live plan is supplied as context.

Rules:

1. GROUNDED ONLY. Answer only from the supplied context plus general study and career common sense. Never invent capabilities, events or numbers that are not in the context.
2. NAME WHAT IS MISSING. When a question needs data the context does not hold, say plainly what is missing and where in the app it lives (e.g. unit evidence lives on the capability map; step detail lives on the roadmap).
3. SHORT. At most about 120 words per reply.
4. PLAIN TEXT. Your reply renders in a plain chat bubble: no markdown headings, bold, bullets or asterisks — they show literally. Short paragraphs only.
5. NEVER JUDGE THE PERSON. No comments on aptitude. Hard things are "a hard topic", never "you are behind".
6. ONE ACTION. Suggest at most one concrete next action per reply, and only when it helps.`;

type CopilotRequest = {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  context: {
    roleTitle: string;
    headline: string;
    yearLevel: number;
    semestersRemaining: number;
    capabilities: { name: string; status: string; importance: string }[];
    upcomingEvents: { name: string; date: string }[];
    classHoursPerWeek: number;
    stepsDone: number;
    stepsTotal: number;
  };
};

export async function POST(request: Request) {
  let body: CopilotRequest;
  try {
    body = (await request.json()) as CopilotRequest;
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Ask something first." }, { status: 400 });
  }

  // The drawer is a scratchpad, not an archive — keep only the recent turns.
  const history = (body.history ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12);

  const c = body.context ?? ({} as CopilotRequest["context"]);
  const contextBlock = `# THE STUDENT'S LIVE PLAN

Target role: ${c.roleTitle ?? "unknown"}
Plan headline: ${c.headline ?? "unknown"}
Year level: ${c.yearLevel ?? "unknown"} · Semesters remaining: ${c.semestersRemaining ?? "unknown"}
Class hours per week: ${c.classHoursPerWeek ?? "unknown"}
Roadmap progress: ${c.stepsDone ?? 0} of ${c.stepsTotal ?? 0} steps done

Capabilities (name · status · importance):
${c.capabilities?.map((cap) => `- ${cap.name} · ${cap.status} · ${cap.importance}`).join("\n") || "none listed"}

Upcoming events:
${c.upcomingEvents?.map((e) => `- ${e.name} — ${e.date}`).join("\n") || "none listed"}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [{ type: "text", text: COPILOT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user" as const, content: contextBlock },
        { role: "assistant" as const, content: "Understood. I will answer from this plan." },
        ...history,
        { role: "user" as const, content: question },
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ reply: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[copilot]", error);
    return NextResponse.json({ error: `The copilot failed: ${message}` }, { status: 502 });
  }
}
