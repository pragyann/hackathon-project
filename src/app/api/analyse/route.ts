import { NextResponse } from "next/server";

import { analyse } from "@/lib/ai/analyse";
import { getDegree, getRole, unitsFor } from "@/lib/data";
import type { StudentProfile } from "@/lib/types";

export const runtime = "nodejs";
// The sequencing call uses adaptive thinking and can run well past the default.
export const maxDuration = 120;

export async function POST(request: Request) {
  let profile: StudentProfile;
  try {
    profile = (await request.json()) as StudentProfile;
  } catch {
    return NextResponse.json({ error: "Could not read the profile." }, { status: 400 });
  }

  const role = getRole(profile.targetRoleId);
  if (!role) {
    return NextResponse.json(
      { error: "Pick a target role before we can map the gap." },
      { status: 400 },
    );
  }

  const units = unitsFor(profile);
  if (units.length === 0 && profile.manualUnits.length === 0) {
    return NextResponse.json(
      { error: "Add at least one completed unit — the roadmap is built from what you have already done." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  try {
    const analysis = await analyse(profile, role, getDegree(profile.degreeId), units);
    return NextResponse.json(analysis);
  } catch (error) {
    // Surfaced rather than swallowed: a demo that fails silently is worse than
    // one that says what broke.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[analyse]", error);
    return NextResponse.json(
      { error: `The analysis failed: ${message}` },
      { status: 502 },
    );
  }
}
