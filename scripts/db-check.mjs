// Quick connectivity check for the local Postgres that backs opt-in account
// sync. Reads DATABASE_URL from the environment or .env.local (parsed by
// hand — no dotenv dependency), runs SELECT now(), prints ok/fail.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readEnvLocal() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(join(root, ".env.local"), "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envLocal = readEnvLocal();
const databaseUrl =
  process.env.DATABASE_URL ??
  envLocal.DATABASE_URL ??
  "postgresql://localhost:5432/onramp";

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query("SELECT now()");
  console.log(`ok — connected, server time: ${result.rows[0].now}`);
  await client.end();
  process.exit(0);
} catch (err) {
  console.error(`fail — ${err.message}`);
  console.error("Is local Postgres running? See README.");
  process.exit(1);
}
