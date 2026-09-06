import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const DB_UNAVAILABLE = {
  error: "Database unavailable — is local Postgres running? See README.",
};

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  try {
    const user = await getSessionUser(token);
    return NextResponse.json({
      user: user ? { email: user.email, nudgesOptIn: user.nudgesOptIn } : null,
    });
  } catch {
    return NextResponse.json(DB_UNAVAILABLE, { status: 503 });
  }
}
