# Onramp

Turns the university units a student has **actually completed** into a stage-aware skill roadmap for the roles they want, then ranks real Melbourne communities against that roadmap.

MentorME Futura Remix Hackathon — **Track 2, Education and Student Success**.

The product thesis in one line: *the same degree and the same target role must produce a visibly different roadmap for a first-year and a final-year.* Year level is the input everything else hangs off.

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Then open http://localhost:3000. The onboarding has two worked examples (Arjun, first year; Priya, final year) that differ **only** in stage — that contrast is the demo.

## What is real

Nothing in this repo is invented. Every number, unit description and event is from a named source, and where a source failed we say so rather than filling the hole.

| Data | Source | Licence |
| --- | --- | --- |
| Role tasks, skills, technologies | O*NET 31.0, US Dept of Labor | CC BY 4.0 |
| Australian demand by occupation | Internet Vacancy Index, Jobs and Skills Australia (July 2026) | Australian Government open data |
| Unit content | University of Melbourne Handbook 2026 | Public course information |
| Melbourne communities | Organisers' own public listings, verified by hand in a browser | — |

Three of the four sources the PRD originally specified turned out to be unusable — roadmap.sh's licence forbids reuse, the Australian Skills Classification was decommissioned in 2023, and Adzuna only returns truncated job descriptions. The replacements and the evidence are written up in **[docs/technical/data-sources.md](docs/technical/data-sources.md)**.

## How it is built

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Claude `claude-opus-5` via `@anthropic-ai/sdk`.

```
src/
  app/            landing · /start onboarding · /plan the output · /method how it works
      api/gap     call 1: coursework -> capability map (server-only; the key never reaches the browser)
      api/roadmap call 2: outstanding capabilities -> semester-paced plan
  components/     GapMap · RoadmapView · EventList · RouteHero · Sparkline · ui primitives
  lib/
      ai/analyse  the two pipeline calls: analyseGap, then planRoadmap
      data        role/degree/event loaders and the deterministic event ranker
      store       the student profile, kept in the browser
  data/           generated corpora (roles, degrees, events) + precomputed demo fixtures
scripts/etl/      the generators; source files live in data/sources/
docs/             the hackathon spec, the PRD, and technical write-ups
```

### The pipeline is split, and the UI shows it

The analysis is two model calls with different characters, so they are two
endpoints. `/plan` runs them in sequence and renders progressively: the gap map
appears the moment call 1 lands, the roadmap streams in behind it, and each
phase fails and retries independently. The active tab lives in the URL
(`/plan?tab=roadmap`), so any view can be deep-linked in a demo.

The two worked examples (Arjun, first year; Priya, final year) ship as
precomputed fixtures in `src/data/fixtures/` — they load instantly, need no API
key, and are labelled as precomputed in the UI. Regenerate them against the
real pipeline with `node scripts/generate-fixtures.mjs` while a keyed dev
server runs.

### The design language

The product maps a route from coursework to a role, it is named after a road
element, and its events are Melbourne street-level — so the visual system is
Australian road wayfinding on street-directory paper: signage-green destination
panels, a gold route line as the signature element, and Overpass (a typeface
descended from Highway Gothic signage lettering) with Overpass Mono for unit
codes and statistics. Text quoted from university handbooks is set in
Newsreader italic so the university's words are visibly not ours. The three
capability states are drawn as road surfaces — solid, half-sealed, dashed — so
the gap map still reads without colour.

### The AI part, briefly

The model does exactly one job: the **semantic join**. `COMP20003 Algorithms and Data Structures` is not a string match for "strong DSA fundamentals", but it is the same competency, and recognising that is the one part of this problem classical matching cannot do.

Three things constrain it:

- **Grounding is enforced in code, not prompted.** Any citation naming a unit the student did not list is dropped server-side before render, and the UI reports how many were dropped. A capability that loses all its evidence is demoted to a gap rather than silently kept.
- **Structured output only** — both calls return schema-validated objects, so no prose can leak into the interface.
- **The model never sees who the student is.** Name, background, visa status and nationality are not inputs. Same coursework, same stage, same role must produce the same plan.

Prompt caching sits on the role corpus, which is identical for every student targeting a role; the per-student brief goes after the breakpoint.

## Regenerating the data

```bash
python3 scripts/etl/build_roles.py    # O*NET + IVI  -> src/data/roles.json
ONLY_CACHED=1 python3 scripts/etl/fetch_units.py   # handbook cache -> src/data/degrees.json
```

Source files are committed so builds are reproducible offline and the exact snapshot behind any demo is auditable.

## Known limitations

Listed in full on the `/method` page in the app, and deliberately so — a prototype that hides its limitations is harder to trust than one that names them.

- **Only 5 units are seeded.** The UniMelb handbook rate-limited automated access partway through collection, and we stopped rather than working around it. Manual unit entry is the universal fallback and works, but the seeded degrees are thin. *This is the most valuable thing to fix.*
- **The ANZSCO join is approximate.** ANZSCO predates most modern data roles: there is no Data Scientist code, and Data Engineer and Cyber Security Analyst share one, so they share a demand figure. Every role carries its mapping confidence.
- **Role content is US data.** O*NET describes what the work involves, which transfers; Australian specificity comes from the demand data. Australia's own skills classification no longer exists publicly.
- **Events are curated, not live.** No public API offers cross-organiser event discovery in Australia.
- **No persistence across devices.** The profile lives in the browser, which is also the strongest version of the privacy promise: the transcript never sits on our server.

## Still to do

- Run the name/nationality invariance test the PRD commits to, and cite the result in the pitch.
- `docs/technical/architecture.md`, `ai-design.md`, `decisions.md`.
- Deploy, and demo from the deployed URL rather than a laptop.
