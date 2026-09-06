import { NextResponse } from "next/server";

import { planRoadmap } from "@/lib/ai/analyse";
import type { Capability, StudentProfile } from "@/lib/types";
import { pipelineError, validateProfile } from "../_lib/validate";

export const runtime = "nodejs";
// The sequencing call uses adaptive thinking and can run well past the default.
export const maxDuration = 120;

type RoadmapRequest = {
  profile: StudentProfile;
  outstanding: Capability[];
};

/** Call 2 of the pipeline: outstanding capabilities → a semester-paced plan. */
export async function POST(request: Request) {
  let body: RoadmapRequest;
  try {
    body = (await request.json()) as RoadmapRequest;
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const validated = validateProfile(body.profile);
  if (!validated.ok) return validated.response;

  const outstanding = Array.isArray(body.outstanding)
    ? body.outstanding.filter((c) => c && c.status !== "evidenced")
    : [];
  if (outstanding.length === 0) {
    return NextResponse.json(
      { error: "Run the gap analysis first — the roadmap is sequenced from it." },
      { status: 400 },
    );
  }

  const { profile, role, degree, units } = validated.value;
  try {
    const roadmap = await planRoadmap(profile, role, degree, units, outstanding);
    return NextResponse.json({ roadmap });
  } catch (error) {
    return pipelineError("roadmap", error);
  }
}
