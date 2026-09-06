import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { SESSION_COOKIE, verifyPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

const DB_UNAVAILABLE = {
  error: "Database unavailable — is local Postgres running? See README.",
};

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  try {
    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
    }>("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);

    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Incorrect email or password" },
        { status: 401 },
      );
    }

    const stored = await query<{ profile: unknown; analysis: unknown }>(
      "SELECT profile, analysis FROM profiles WHERE user_id = $1",
      [user.id],
    );
    const row = stored.rows[0];

    const token = await createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({
      user: { email: user.email },
      profile: row?.profile ?? null,
      analysis: row?.analysis ?? null,
    });
  } catch {
    return NextResponse.json(DB_UNAVAILABLE, { status: 503 });
  }
}
