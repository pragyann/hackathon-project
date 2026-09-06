import { NextResponse } from "next/server";

import { analyseGap } from "@/lib/ai/analyse";
import { pipelineError, validateProfile } from "../_lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Call 1 of the pipeline: coursework → capability map. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the profile." }, { status: 400 });
  }

  const validated = validateProfile(body);
  if (!validated.ok) return validated.response;

  const { profile, role, degree, units } = validated.value;
  try {
    const result = await analyseGap(profile, role, degree, units);
    return NextResponse.json(result);
  } catch (error) {
    return pipelineError("gap", error);
  }
}
