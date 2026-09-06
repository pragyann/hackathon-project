import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const DB_UNAVAILABLE = {
  error: "Database unavailable — is local Postgres running? See README.",
};

export async function PUT(request: Request) {
  let body: { profile?: unknown; analysis?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  try {
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    await query(
      `INSERT INTO profiles (user_id, profile, analysis, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, now())
       ON CONFLICT (user_id)
       DO UPDATE SET profile = EXCLUDED.profile, analysis = EXCLUDED.analysis, updated_at = now()`,
      [
        user.id,
        JSON.stringify(body.profile ?? null),
        body.analysis != null ? JSON.stringify(body.analysis) : null,
      ],
    );

    return NextResponse.json({});
  } catch {
    return NextResponse.json(DB_UNAVAILABLE, { status: 503 });
  }
}
