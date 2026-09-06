import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export const runtime = "nodejs";

const DB_UNAVAILABLE = {
  error: "Database unavailable — is local Postgres running? See README.",
};

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  try {
    if (token) {
      await destroySession(token);
    }
  } catch {
    return NextResponse.json(DB_UNAVAILABLE, { status: 503 });
  }

  jar.delete(SESSION_COOKIE);
  return NextResponse.json({});
}
