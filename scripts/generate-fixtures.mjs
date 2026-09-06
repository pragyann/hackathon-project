/**
 * Regenerates the precomputed worked examples by running the real pipeline.
 *
 * The shipped fixtures let the demo run instantly and without an API key; this
 * script is how they stay honest — rerun it against a dev server that has
 * ANTHROPIC_API_KEY set, and commit the result.
 *
 *   npm run dev            # in one terminal, with .env.local populated
 *   node scripts/generate-fixtures.mjs [http://localhost:3000]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(import.meta.dirname, "..", "src", "data", "fixtures");

const shared = {
  degreeId: "unimelb-bsci-cis",
  city: "Melbourne",
  manualUnits: [],
  resumeSkills: [],
  targetRoleId: "software-developer",
  exploring: false,
};

const PROFILES = {
  arjun: {
    ...shared,
    name: "Arjun",
    yearLevel: 1,
    semestersRemaining: 6,
    completedUnitCodes: ["COMP10001", "COMP10002"],
  },
  priya: {
    ...shared,
    name: "Priya",
    yearLevel: 3,
    semestersRemaining: 1,
    completedUnitCodes: ["COMP10001", "COMP10002", "COMP20003", "COMP20005"],
  },
};

async function post(route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${route}: ${data.error ?? res.status}`);
  return data;
}

await mkdir(OUT, { recursive: true });

for (const [name, profile] of Object.entries(PROFILES)) {
  console.log(`→ ${name}: gap analysis…`);
  const { gap, grounding } = await post("/api/gap", profile);
  const outstanding = gap.capabilities.filter((c) => c.status !== "evidenced");
  console.log(`  ${gap.capabilities.length} capabilities, ${outstanding.length} outstanding. Roadmap…`);
  const { roadmap } = await post("/api/roadmap", { profile, outstanding });

  const file = path.join(OUT, `${name}.json`);
  await writeFile(file, JSON.stringify({ gap, roadmap, grounding }, null, 2));
  console.log(`  wrote ${file}`);
}
console.log("Done. Review the diff before committing — fixtures ship in the demo.");
