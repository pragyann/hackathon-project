// Server-only: Postgres access for Onramp's OPT-IN account sync.
//
// Local-first stance: the app works entirely from localStorage by default —
// this database only ever sees a user's plan if they explicitly create an
// account to keep it across devices. No account, no rows, no tracking.
import "server-only";

import { Pool, type QueryResult, type QueryResultRow } from "pg";

// Cache the pool (and the one-time schema bootstrap) on globalThis so Next.js
// dev-mode HMR doesn't leak a new Pool on every module reload.
const globalForDb = globalThis as unknown as {
  __onrampPool?: Pool;
  __onrampSchemaReady?: Promise<void>;
};

function getPool(): Pool {
  if (!globalForDb.__onrampPool) {
    globalForDb.__onrampPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://localhost:5432/onramp",
    });
  }
  return globalForDb.__onrampPool;
}

async function ensureSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      nudges_opt_in boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile jsonb NOT NULL,
      analysis jsonb,
      updated_at timestamptz DEFAULT now()
    )
  `);
}

function schemaReady(): Promise<void> {
  if (!globalForDb.__onrampSchemaReady) {
    globalForDb.__onrampSchemaReady = ensureSchema().catch((err) => {
      // Allow a retry on the next query if bootstrap failed (e.g. Postgres
      // wasn't running yet).
      globalForDb.__onrampSchemaReady = undefined;
      throw err;
    });
  }
  return globalForDb.__onrampSchemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  await schemaReady();
  return getPool().query<T>(text, params as unknown[] | undefined);
}
