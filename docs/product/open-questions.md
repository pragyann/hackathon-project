# Open questions and decisions to make

Ordered by how much they block the build. Resolve the blockers before writing feature code.

## Blocking

### 1. Where do networking events actually come from?
The riskiest dependency in the whole product. Several public event APIs have been deprecated or moved behind paid tiers over the years, so this needs verifying with real API calls, not assumption. Candidates to test: Humanitix (Australian, has an API), Luma, Meetup, university career-service event pages, industry body event calendars. **Decide by:** before pillar 2 development starts. **Fallback if nothing works:** a hand-curated but genuinely real set of current Melbourne and Sydney events, honestly labelled in the demo as a snapshot, with the live integration described in the implementation plan. This is an acceptable outcome and costs almost nothing in the rubric.

### 2. How do we get course data, and how deep?
Three options, and the PRD assumes a blend:
- **Ask the student to paste or confirm** their units. Lowest build cost, always works, but adds onboarding friction, and friction is the thing that kills onboarding.
- **Seed a few real degrees** from public Australian university handbooks, so the demo degrees are pre-filled and feel magical.
- **Fetch handbook data live.** Highest cost, per-institution, and a poor use of hackathon hours.

Recommendation: seed two or three real degrees deeply for the demo, keep manual entry as the universal fallback, describe live integration as the production path. **Decide by:** before onboarding is built.

### 3. What is the demo's coverage envelope?
How many degrees, how many target roles, how many cities, **how many year levels**? Going narrow and deep beats broad and shallow when the demo is five minutes and judges will test one path. Recommendation: one city, two or three degrees, four or five roles, all real.

Year level is the exception to "go narrow": the demo must cover **at least two clearly separated stages** (an early-stage and a late-stage student), because showing the same degree and target role producing two visibly different roadmaps is the single most convincing thing we can put in front of a judge. It proves the personalisation is real rather than a static roadmap with a name on it, and it demonstrates the longitudinal thesis in about fifteen seconds. Budget demo data for both. **Decide by:** before seeding any data.

### 4. Does the roadmap source cover our target roles, and can we use it?
The open developer roadmap data covers software roles well. If our target roles include data analyst or data engineer, verify coverage before committing, and check the licence and attribution requirements. **Decide by:** before pillar 1 development starts.

### 5. Job listings API
Verify Australian coverage, free-tier limits and terms for the chosen provider (Adzuna is the leading candidate). Confirm the listing text is rich enough that skill extraction is actually possible, since some feeds return only a truncated summary. **Decide by:** before the skills-gap feature is built.

## Non-blocking, decide before the pitch

### 6. Naming
"Onramp" is a placeholder. Wanted: something that carries the study-to-work transition without sounding like a job board. Worth 10 minutes from the Communication Lead, no more.

### 7. Do we build accounts and persistence, or is it session-only?
Session-only is faster and sidesteps most privacy exposure for a prototype. Persistence enables the progress-tracking demo.

This is now a closer call than it was, because the product is explicitly longitudinal: a semester-over-semester loop is hard to tell as a story if nothing is ever saved. Two options, and the second is probably right for a hackathon. Either build real persistence, or run session-only and demo the semester loop from two pre-seeded profiles of the same student at different points in their degree. The second gets the entire narrative benefit for a fraction of the build cost, and is honest as long as we say so.

### 10. How do we handle a student who does not know their target role?
Most early-stage students do not, and the PRD commits to an exploration path for them (the Sam persona). Open question is how much of it to build for the demo: a full role-comparison view, or a lightweight "here are three roles your units point toward, pick one to explore" step. Leaning lightweight, but it cannot be skipped entirely, because a first-year forced to confidently name a job title is a first-year who closes the tab.

### 8. How is the skills gap visualised?
This is the screenshot that will end up on the pitch slide and it is the moment the product's value becomes obvious. Worth real design attention rather than a default table.

### 9. Where do we prove the fairness claim?
The PRD commits to a name-and-nationality-invariance test. Decide whether we actually run it and cite the result in the pitch, which would be genuinely strong under the Evaluation and Impact criterion, or only describe the intent. Running it is cheap and citing a real result is far more convincing than stating a principle.
