import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { SESSION_COOKIE, hashPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const DB_UNAVAILABLE = {
  error: "Database unavailable — is local Postgres running? See README.",
};

export async function POST(request: Request) {
  let body: {
    email?: unknown;
    password?: unknown;
    nudgesOptIn?: unknown;
    profile?: unknown;
    analysis?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nudgesOptIn =
    typeof body.nudgesOptIn === "boolean" ? body.nudgesOptIn : true;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    let userId: string;
    try {
      const inserted = await query<{ id: string }>(
        "INSERT INTO users (email, password_hash, nudges_opt_in) VALUES ($1, $2, $3) RETURNING id",
        [email, passwordHash, nudgesOptIn],
      );
      userId = inserted.rows[0].id;
    } catch (err) {
      // Unique violation race: another request created the account first.
      if ((err as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }
      throw err;
    }

    if (body.profile != null) {
      await query(
        `INSERT INTO profiles (user_id, profile, analysis, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, now())
         ON CONFLICT (user_id)
         DO UPDATE SET profile = EXCLUDED.profile, analysis = EXCLUDED.analysis, updated_at = now()`,
        [
          userId,
          JSON.stringify(body.profile),
          body.analysis != null ? JSON.stringify(body.analysis) : null,
        ],
      );
    }

    const token = await createSession(userId);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ user: { email } });
  } catch {
    return NextResponse.json(DB_UNAVAILABLE, { status: 503 });
  }
}
