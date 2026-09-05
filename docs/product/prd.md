# Product Requirements Document

**Working name:** Onramp (placeholder, see [open-questions.md](open-questions.md#naming))
**Track:** Track 2 - Education and Student Success
**Status:** Draft v0.2, initial idea captured. Scope not yet locked.

## 1. Summary

Onramp turns a student's actual university coursework into a personalised, industry-referenced skill roadmap aimed at the specific roles they want, and then connects that roadmap to the real-world step most students skip: showing up in person and meeting people who hire.

It is designed to run **for the whole degree, from first semester to graduation**, not as a panic tool in the final year. Each semester the student's completed units change, the industry's requirements move, and the roadmap updates against both. The product's job is to keep a student continuously aligned with the industry they are heading into, so that by the time they graduate the gap has been closed incrementally instead of discovered all at once.

Two pillars, one loop:

1. **Get ready.** Map what the student is already studying against what the roles they want actually require, and generate the delta as a concrete, sequenced roadmap across the years they have left.
2. **Get in the room.** Surface and rank local, genuinely relevant networking events, meetups and industry nights, so the roadmap ends in a conversation rather than another certificate.

## 2. Why this problem

The organisers' framing is that "Australia is not lacking talent. It is facing a growing gap between graduate capability and workforce expectations in an AI-enabled economy." Our reading of that gap is more specific, and it is the thesis of the product:

**Gap 1 - the coursework-to-capability gap.** University content is not useless, but it is not sufficient and it is not legible as job readiness. A student finishing a Data Structures unit and a Databases unit does not know that this puts them two thirds of the way to a backend internship and that the missing third is version control, a deployed project and one cloud service. Nobody joins those dots for them, so students either assume the degree is enough or burn time on a generic roadmap that ignores everything they have already covered. The work outside the degree is the work that gets the job, and it is currently unguided.

**Gap 2 - the capability-to-employment gap.** Being skilled is not enough. Roles are still filled through people, and referral remains the most effective route into a job. This is the barrier least served by existing tools: job boards optimise for applying, not for meeting. Students do not know which events exist, which are worth their time, or which are appropriate for their level, so most of them never go to one and compete solely through the cold-application channel with the worst odds. The organisers' own research names "building professional networks" as an explicit barrier, and while it names it for international talent specifically, a domestic student three years from graduation has no professional network either.

**The timing problem that makes both gaps worse.** Almost every existing career tool activates at the end of the degree. Career services get busy in final year, job boards matter once you are applying, and resume workshops run in the last semester. By then the student has one or two semesters of runway, which is not enough to build a portfolio, learn a missing stack and establish a network from zero. Meanwhile a first-year student has three years of runway and no idea what to do with it, so they do nothing until it is late, and then discover the gap as a crisis rather than a series of small adjustments. The gap is at its cheapest to close in year one and at its most expensive in the final semester, and the tooling is distributed in exactly the opposite pattern.

This is why the product is longitudinal. The same student, same degree, at different points in their course, should get materially different guidance: foundations and habits early, depth and internship readiness in the middle, portfolio and targeted applications at the end.

Existing tools handle exactly one slice each: job boards list roles, roadmap sites give generic curricula, university career services offer scarce human appointments, and event platforms list everything with no filter for relevance. Nothing sits across the whole path, nothing starts from the student's actual transcript, and nothing stays with them across the degree.

Evidence from the brief supporting the size of this: 69% of Australian employers report difficulty finding skilled talent; the national vacancy fill rate is 68.2%; 1.67m students enrolled in 2024; universities are under financial pressure (40%+ in deficit over five years, funding per domestic student down 6% since 2017), so any answer has to scale without adding staff headcount.

## 3. Target user

> **University students in Australia, bachelors or masters, at any stage of their degree.**

Year level is not a filter on who we serve. It is an input that changes what we recommend: direction and foundations early, depth in the middle, portfolio and applications at the end.

The rubric awards 15% for "clearly defines a specific problem and primary target user". A broad user is fine as long as the *problem* is sharp, so lead the pitch with the problem and the personas, never with market size.

### Personas

Three, spanning the stages that change the output. Demoing more than one proves the personalisation is real rather than a static roadmap with a name on it.

**Arjun, 19, first semester.** Bachelor of Computer Science in Melbourne, three years to go. Has completed one programming unit. Has no idea what roles exist beyond "software engineer", no projects, no GitHub account, and has never heard of a meetup. Their problem is not being behind; it is having the most runway of anyone and no map for it. The product's job here is direction and habit: one small thing to build on top of the unit they are taking right now, one student-friendly event this semester, and a sense of where the next three years lead. Reaching students at this stage is where the product creates the most value, because everything compounds.

**Priya, 22, final year.** Master of Information Technology in Melbourne, graduating in 8 months. Has finished units in programming, databases and statistics. Wants a data analyst or junior data engineer role. Has applied to roughly 40 listings with no response. Does not know that their Statistics unit plus one dashboard project would make them competitive, and has never been to an industry meetup because they do not know which ones are for them. The product's job here is triage: the shortest path to being credible for the roles they are already applying for, and the events where those employers actually are.

**Sam, 20, second year, undecided.** Bachelor of Information Systems. Enjoys the database and analytics units far more than the infrastructure ones but has not connected that preference to a job title, and is drifting toward whatever graduate program advertises hardest. The product's job here is exploration before commitment: show what several roles actually require, which ones their existing units already point at, and what a semester of evidence-gathering in each direction would look like. This persona is the honest answer to "what if the student does not know their target role yet", which is most students most of the time.

**Secondary users, out of scope for the prototype but named for the implementation plan:** university career services (who would deploy this and want the cohort-level skills-gap view) and student clubs or event organisers (who want relevant attendees).

## 4. Product principles

1. **Start from what they already have.** Every recommendation references a unit the student has actually completed. A roadmap that ignores their transcript is the thing we are replacing.
2. **Always show the "why".** Each recommendation carries its rationale and its source (this unit, this role, this listing). The brief penalises technology that cannot be explained, and an unexplained recommendation is one the student will not act on.
3. **Recommend, never decide.** No score gates a student out of a path. The brief explicitly warns against fully automated high-impact decisions without human review, and telling someone they are unsuited to a career is exactly that.
4. **Meet them where they are in the degree.** Year level is a first-class input, not a filter. Guidance for a first-year is direction, foundations and habit-building across years; for a final-year it is triage against a deadline. The same recommendation given at the wrong stage is either overwhelming or useless.
5. **Effort in must be minutes, not hours.** Onboarding that demands a full manual skills inventory is onboarding nobody finishes. Infer aggressively from a resume and a degree, then let the student correct.
6. **Only data we could really have.** Every source must be one a real deployment could legitimately use. Anything else fails the "data that would not realistically be available" constraint.

## 5. Solution

### 5.1 End-to-end user journey

1. **Onboard (target: under 3 minutes).** Student names their university, degree, current year and location, and optionally uploads a resume. We parse the resume for skills, projects and experience, and infer location and institution. **Year level is captured here and drives everything downstream.** A first-year with no resume is a first-class case, not a degraded one: the product must be fully useful to someone whose only input is "Computer Science, year 1, Melbourne".
2. **Confirm coursework.** We resolve their degree to a set of units and pre-fill completed ones. Student confirms, adds or removes. This screen is the product's foundation and must feel like confirming, not data entry.
3. **State the target, or explore.** Student picks one to three target roles, plus preferences (industry, work type). Students who do not yet know what they want (most early-stage students) instead get a comparison view of candidate roles their existing units already point toward, and can proceed with a tentative direction. Forcing a confident role choice out of a first-year would be the single fastest way to make the product useless to them.
4. **See the gap.** A skills map: what their coursework already demonstrates, what target roles require, and the delta between them, each item traced to its evidence.
5. **Get the roadmap, spread across the time they have.** The delta becomes a sequenced plan of concrete steps (learn X, build Y, ship Z), derived from an industry-standard roadmap, pruned of everything they have already covered, and distributed across their remaining semesters rather than dumped as one list. A student with three years left sees a light, sustainable load per semester and a long arc; a student with one semester left sees a triaged shortlist of what matters most now. Same engine, different horizon.
6. **Get in the room.** Networking events near them, ranked by relevance to their target role and current stage, each with a reason for the recommendation.
7. **Return, every semester.** This is the loop that makes the product longitudinal rather than a one-off report. Students mark steps done and events attended. At the start of each semester they confirm newly completed units, and the roadmap re-derives against both their new coursework and the current state of the job market, which has moved in the meantime. Over a three-year degree this is the difference between six small course corrections and one late crisis.

### 5.2 Pillar 1 - Coursework-to-capability

**The core mechanism, stated plainly for the judges:** we hold four inputs, and the product is the join between them.

- *What you have:* completed units, resume skills, projects.
- *What the market wants:* required and preferred skills extracted from current Australian job listings for the target role.
- *How to get from one to the other:* an open, industry-standard roadmap for that role, pruned and re-sequenced against what you already have.
- *How long you have:* semesters remaining, which turns a flat list of gaps into a paced plan and decides what is realistic to attempt at all.

The AI's job is the semantic matching between the first three vocabularies, which is exactly the kind of fuzzy translation that classical matching cannot do and an LLM does well. "COMP20003 Algorithms and Data Structures" is not a string match for "strong DSA fundamentals" in a listing, or for "Data Structures" in a roadmap, but it is the same competency, and being able to say so is the product.

The fourth input is what makes it a companion rather than a report. Without it we produce the same intimidating list for a first-year and a final-year, which helps neither: the first-year is overwhelmed and disengages, the final-year wastes their remaining months on foundations instead of on the two things that would actually make them hireable by March.

**The semester loop.** Because units complete and job requirements move, the join is re-run each semester rather than computed once. Two mechanics follow from this, and both are what a student would actually come back for: *"you just finished Databases, here is the one thing to build on top of it this semester while it is still fresh"*, and *"the roles you are targeting have started asking for something your roadmap did not include six months ago"*.

### 5.3 Pillar 2 - Capability-to-employment

Networking events, filtered and ranked rather than merely listed. Ranking signals: geographic proximity; relevance of the event's topic to the target role; appropriateness to the student's stage; cost; timing against their study load. Each recommendation shows why it surfaced.

The differentiator over any event site is the same one as pillar 1: we know their roadmap, so we can say *"this meetup covers the exact step you are on this month"* and prepare them for it, rather than dumping a list of events on them.

**Stage matters here even more than in pillar 1.** A first-year sent to a senior architects' dinner has a bad time and never goes to another event, which is a worse outcome than not recommending anything. Early students get low-stakes, student-heavy, free events: university clubs, student chapters, intro nights, hackathons. Later students get industry meetups, conferences and employer-hosted evenings where the people in the room are the people who hire. The intent is to build the habit early with easy wins so that the high-value rooms are not intimidating by the time they matter.

## 6. Scope

The prototype is 35% of the score and must demo end to end in five minutes. Scope is therefore split explicitly. **P0 is the demo. Everything else is the roadmap slide.**

### P0 - must exist and be demoable

| # | Feature | Acceptance criteria |
| --- | --- | --- |
| P0-1 | Resume and profile intake | Student uploads a PDF resume or fills a short form; system extracts name, skills, projects, education, location. Manual correction possible on every field. |
| P0-2 | Coursework capture | Student's degree resolves to a unit list they confirm or edit; a manual add/paste path always exists as fallback. |
| P0-3 | Target role selection or exploration | Student picks from a curated list of roles seeded with real Australian listing data, or browses a comparison of roles their current units already point toward if they are undecided. |
| P0-4 | Skills gap map | Visual, side-by-side: skills evidenced by coursework and resume vs skills required by target role, with the delta highlighted. Every "have" traces to a named unit or resume line. |
| P0-5 | Stage-aware personalised roadmap | Sequenced steps addressing the delta, with rationale per step, pruned of already-covered material, and distributed across the student's remaining semesters. **Two students with the same degree and target role but different year levels must produce visibly different roadmaps.** This is the single most important thing to get right: it is both the product thesis and the demo moment. |
| P0-6 | Ranked networking events | List of events near the student, each with a relevance reason and a link. Filterable by date, cost and format. |
| P0-7 | Explainability surface | Every recommendation exposes its "why" in one click. Non-negotiable: it is directly rubric-scored. |

### P1 - build if P0 lands early

- Progress tracking: mark steps complete, roadmap re-sequences.
- Semester rollover: confirm newly completed units, re-derive the roadmap, show what changed and why.
- Live job listing feed rather than a seeded snapshot.
- Resume rewrite suggestions phrased against target-role language.
- Event preparation: who to look for, what to ask, given the student's current roadmap step.

### P2 - vision, for the "future development" slide only

- Cohort dashboard for university career services (this is also the commercial story).
- Mentor matching to alumni.
- Portfolio and evidence builder.
- Post-event follow-up prompts and network tracking.

### Explicitly out of scope

- Auto-applying to jobs on the student's behalf.
- Any employability score, ranking or gating of students.
- Scraping any site whose terms prohibit it, for demo convenience or otherwise.
- Chat as the primary interface. The value here is structured comparison, and a chatbot would hide it.

## 7. Data sources

This is the highest-risk part of the plan and the thing judges are most likely to probe, because the brief singles out "data that would not realistically be available" as a failure mode.

| Data | Approach for the prototype | Path in production | Risk |
| --- | --- | --- | --- |
| Student profile and resume | Direct user upload | Same | None |
| Course and unit content | User confirms/pastes; seeded handbook data for two or three demo degrees | Institutional integration, or student-supplied. Australian university handbooks are public. | Medium: coverage is per-institution, so seed depth over breadth for the demo |
| Industry roadmaps | Open source developer roadmap data (roadmap.sh / kamranahmedse/developer-roadmap), checked in as a snapshot | Same, with periodic refresh | Low, but licence and attribution must be verified before use |
| Job listings | A licensed job search API with Australian coverage (Adzuna is the leading candidate: free tier, AU market, structured) rather than scraping Seek or LinkedIn | Same API on a paid tier | Medium: verify AU coverage and terms early. Fallback is a curated snapshot of real listings, clearly labelled as such in the demo |
| Networking events | To be determined, and this is the weakest link. Candidates: Humanitix, Luma, university career-service event pages, Meetup. Several public event APIs have been deprecated or moved behind paid tiers. | Partnerships with event organisers and university career services | **High.** Verify at least one workable source before committing the pillar. Fallback is a hand-curated but genuinely real set of Melbourne/Sydney events for the demo |
| Skills taxonomy | LLM-driven semantic matching, optionally anchored to an open skills framework | Anchored to a formal taxonomy such as ANZSCO or the Australian Skills Classification | Low |

**Standing rule:** no scraping of any site that prohibits it. Real APIs, public open data, user-supplied content, or an honestly-labelled curated snapshot. A snapshot of real data shown honestly costs nothing in the rubric; a scraper that violates terms costs the "practical implementation" criterion outright.

## 8. Responsible AI, privacy and accessibility

Directly scored under Evaluation and Impact (20%), and cheap to earn if designed in from the start.

**Privacy and data protection.** Resumes are personal information under the Australian Privacy Act, and student records more so. Collect only what the recommendations need. Be explicit at upload about what is stored, where and for how long. Give the student a delete path. Prototype should not persist real resumes beyond the session unless the user asks.

**Bias and fairness.** Three live risks. First, roadmaps and job listings encode the biases of whoever wrote them, so recommendations may over-index on the profile the listings were written for. Second, recommendations must never differ on the basis of nationality, visa status, name or gender. We do not use these as ranking inputs. Concretely testable: same coursework, same year level and same target role, different name and country of origin, must produce the same roadmap. This is a test we should actually run and be able to cite in the pitch. Third, and specific to serving all year levels: the system must not quietly write off late-stage students by handing a final-year student a three-year roadmap they cannot complete, nor discourage an early student by front-loading everything. Being unable to serve one end of the range well is a fairness problem, not just a quality one.

**Transparency.** Every recommendation carries its rationale and source. This is P0-7, not a nice-to-have.

**Human oversight.** The system recommends; the student decides; the university career adviser remains in the loop for anything consequential. No automated gating, scoring or rejection of a person.

**Hallucination.** The brief names AI hallucination as a top-5 challenge for AI in education. A confidently invented course prerequisite or fake event is a direct product failure. Recommendations must be grounded in retrieved data rather than model recall, and anything the model cannot ground should be omitted rather than guessed.

**Accessibility and inclusion.** Plain English, no assumed Australian cultural context in the copy, no jargon in the UI, keyboard navigable, screen-reader labelled, sensible colour contrast, readable on a phone. Our primary user may be reading in a second language.

## 9. Impact measurement

The brief requires named success indicators. Split into what a pilot could measure and what a scaled deployment would.

**Leading indicators (measurable in a semester-long pilot):**

- Onboarding completion rate, and time to first roadmap (target: under 5 minutes).
- Proportion of students who mark at least one roadmap step complete within two weeks.
- Number of recommended events actually attended per student per semester, against a baseline of near zero.
- Self-reported career-readiness confidence, before and after, on a short pre/post survey.
- Perceived relevance of recommendations, rated per item, which doubles as our evaluation signal for the matching quality.
- **Adoption by year level.** Reported as a breakdown, never as a single average. If only final-year students adopt, the longitudinal thesis has failed and the product is just another late-stage career tool, so this is the metric that tells us whether we built what we intended.

**Longitudinal indicators (the ones that matter most, and the reason to start students early):**

- Semester-over-semester return rate: do students come back at the start of the next teaching period to re-derive their roadmap?
- Cumulative roadmap steps completed by graduation, compared between students who joined in first year and students who joined in final year. This is the direct test of the "start early, compound" claim.
- Whether early joiners arrive at their final year with a portfolio and a network already in place, rather than starting both from zero.

**Lagging indicators (a full cohort cycle):**

- Interview conversion rate against a matched cohort.
- Time from graduation to first relevant role.
- Proportion of roles found through a connection rather than a cold application, which is the metric the networking pillar actually exists to move.

**For the university (the buyer):** career-service appointment demand deflected, cohort-level skills-gap visibility, engagement across student segments who never book an appointment.

## 10. Implementation plan

**Who deploys it.** An Australian university career service, or a student association, is the natural first customer. They already own the mandate and the student relationship, are under exactly the resource pressure the brief describes (40%+ in deficit, funding per student down 6%), and cannot solve it by hiring more advisers. The pitch to them is scale: personalised career guidance for the whole cohort at the cost of serving the fraction who currently book appointments.

**What it needs.** Handbook or curriculum data for their degrees (public), a job listings API subscription, hosting, and a career-services owner to review recommendation quality each term.

**Phasing.** Pilot with one faculty at one university for a semester, deliberately recruiting across all year levels rather than only the final-year cohort that career services normally reach, and measuring the leading indicators above. Expand to the institution. Expand to more institutions, at which point the cohort dashboard becomes the commercial product.

**The distribution advantage of starting early.** A university that adopts this at first-year orientation gets a student who engages for the full duration of their degree, which is worth far more to them than a final-year intervention and is also the point at which they have the student's attention. Orientation week is the natural insertion point, and it is a much easier sell than competing for final-year students who are already panicking.

**Key risks.** Event data availability (see section 7). Course data coverage per institution. Recommendation quality at the tail of unusual degrees. Student trust in an AI telling them what to study, which is why the explainability surface is P0.

The distinctive risk of a longitudinal product is **early-stage motivation**: a first-year student has no deadline pressure, so the thing that makes a final-year student engage does not exist for them. If the product is not genuinely useful and low-effort in week one, they will not return in week ten, and the compounding thesis never gets tested. Mitigation is to make the first session deliver something concrete and small rather than a three-year plan: one thing to build this semester, one event to attend, and a picture of where it leads.

## 11. Open questions

Tracked in [open-questions.md](open-questions.md). The ones that block a locked scope: the networking data source, how deep to go on course data, and how many degrees and roles the demo needs to cover convincingly.
