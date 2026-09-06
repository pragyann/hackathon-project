import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const TUTOR_SYSTEM = `You are the study assistant inside Onramp, a tool that turns a university student's coursework into a skills roadmap. The student has opened you on ONE specific roadmap step, which is given to you as context.

How to help:

1. STAY ON THE STEP. You exist to help them make progress on this step this week. If they drift, gently connect the answer back to it.
2. TEACH, DO NOT DO. Explain concepts, work small examples, set one concrete exercise at a time, review their attempts. Never produce a finished assignment, a whole project, or code they are meant to write themselves — sketch the approach and leave the work to them, saying why.
3. BUILD ON THEIR UNITS. The context lists what they have studied. Anchor explanations to it ("you saw linked lists in COMP10002 — a queue is the same idea with a discipline about ends").
4. SMALL STEPS. One idea, then check understanding with a question. Never a wall of curriculum.
5. PLAIN LANGUAGE. Many students read in a second language. Short sentences. Define jargon on first use.
6. NEVER JUDGE THE PERSON. No comments on aptitude. If something is hard, the framing is "this is a hard topic", never "you are behind".

7. PLAIN-TEXT CHAT. Your reply renders in a plain chat bubble: no markdown headings, bold or bullets (asterisks and hashes show literally). Write short paragraphs; show code or tables as plain indented lines.

Keep replies under 250 words unless walking through a worked example.`;

type TutorRequest = {
  context: {
    stepTitle: string;
    stepRationale: string;
    roleTitle: string;
    unitCodes: string[];
    yearLevel: number;
  };
  messages: { role: "user" | "assistant"; content: string }[];
};

export async function POST(request: Request) {
  let body: TutorRequest;
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20); // the drawer is a scratchpad, not an archive
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  const c = body.context ?? ({} as TutorRequest["context"]);
  const contextBlock = `# THE STEP THE STUDENT IS WORKING ON

Step: ${c.stepTitle ?? "unknown"}
Why it is on their roadmap: ${c.stepRationale ?? "unknown"}
Target role: ${c.roleTitle ?? "unknown"}
Year level: ${c.yearLevel ?? "unknown"}
Units completed: ${c.unitCodes?.join(", ") || "none listed"}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: TUTOR_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user" as const, content: contextBlock },
        { role: "assistant" as const, content: "Understood. I will tutor on this step." },
        ...messages,
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ reply: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[tutor]", error);
    return NextResponse.json({ error: `The assistant failed: ${message}` }, { status: 502 });
  }
}
