// Server-only: password hashing + cookie sessions for Onramp's OPT-IN sync.
//
// Local-first stance: accounts exist only so a student can keep their plan
// across devices (and get in-app semester check-ins). Passwords are scrypt-
// hashed, sessions live in HttpOnly cookies, and the delete path removes
// everything via ON DELETE CASCADE.
import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { query } from "@/lib/db";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "onramp_session";

const KEY_LENGTH = 64;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(
  pw: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(pw, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt],
  );
  return token;
}

export async function getSessionUser(
  token: string | null | undefined,
): Promise<{ id: string; email: string; nudgesOptIn: boolean } | null> {
  if (!token) return null;
  const result = await query<{
    id: string;
    email: string;
    nudges_opt_in: boolean;
  }>(
    `SELECT u.id, u.email, u.nudges_opt_in
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, nudgesOptIn: row.nudges_opt_in };
}

export async function destroySession(token: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}
