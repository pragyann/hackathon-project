import { NextResponse } from "next/server";

import { getDegree, getRole, unitsFor } from "@/lib/data";
import type { Degree, Role, StudentProfile, Unit } from "@/lib/types";

export type ValidatedRequest = {
  profile: StudentProfile;
  role: Role;
  degree: Degree | null;
  units: Unit[];
};

/**
 * Shared request validation for both pipeline calls. Returns either the
 * validated inputs or a ready-to-send error response — the routes stay thin.
 */
export function validateProfile(
  body: unknown,
): { ok: true; value: ValidatedRequest } | { ok: false; response: NextResponse } {
  const profile = body as StudentProfile;

  const role = getRole(profile?.targetRoleId ?? null);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Pick a target role before we can map the gap." },
        { status: 400 },
      ),
    };
  }

  const units = unitsFor(profile);
  if (units.length === 0 && (profile.manualUnits?.length ?? 0) === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Add at least one completed unit — the roadmap is built from what you have already done.",
        },
        { status: 400 },
      ),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server — or load a worked example, which is precomputed.",
        },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true,
    value: { profile, role, degree: getDegree(profile.degreeId), units },
  };
}

export function pipelineError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[${scope}]`, error);
  return NextResponse.json({ error: `The analysis failed: ${message}` }, { status: 502 });
}
