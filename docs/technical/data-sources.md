# Data sources

Every external dependency, verified with real calls before any application code was written. `technical/README.md` called this the first technical task on the grounds that two of the four could invalidate a product pillar and that finding out on day one is cheap. That turned out to be correct: **three of the four sources named in `prd.md` §7 are unusable as specified.**

This file is a pitch input, not documentation housekeeping. Two rubric bullets under Prototype and Technical Execution (35%) are about *explaining* the technical approach rather than writing it, and a fifth is *"demonstrates testing and awareness of key technical limitations or risks"*. What follows is that awareness, written down as it was discovered.

Verified 6 September 2026.

## Summary

| Dependency | PRD assumption | Verdict | What we use instead |
| --- | --- | --- | --- |
| Industry roadmaps (roadmap.sh) | "Low risk, licence must be verified" | ❌ **Licence forbids it** | O*NET 31.0 |
| Australian Skills Classification | Named as the production-path taxonomy | ❌ **Decommissioned** | O*NET 31.0 |
| Job listings (Adzuna) | "Verify listing text is rich enough" | ⚠️ **Too thin to extract from** | JSA Internet Vacancy Index |
| Networking events | "High risk, weakest link" | ⚠️ **Still the weakest link** | Curated real events |
| Course/unit data | Seed real degrees, manual fallback | ✅ Unchanged | Public AU handbooks |

## The three that failed

### 1. roadmap.sh — licence prohibits reuse

`prd.md` §7 proposed checking in a snapshot of `kamranahmedse/developer-roadmap` as the "how to get from A to B" source, rating the risk "low, but licence and attribution must be verified before use".

The repository has moved to `nilbuild/developer-roadmap`. GitHub reports its licence as `NOASSERTION` — a custom licence, not an OSI one. Its text:

> Everything including text and images in this project are protected by the copyright laws. You are allowed to use this material for personal use but are not allowed to use it for any other purpose including publishing the images, the project files or the content in the images in any form either digital, non-digital, textual, graphical or written formats.

Checking a snapshot into this repository and shipping it inside a product is exactly the prohibited use. **Not used.** The brief's "practical implementation" criterion is not satisfied by a product built on a licence breach, and this is the sort of thing a judge with a legal background asks about.

### 2. Australian Skills Classification — decommissioned

The PRD named the ASC as the production-path skills taxonomy ("anchored to a formal taxonomy such as ANZSCO or the Australian Skills Classification"). It no longer exists as a public dataset. From Jobs and Skills Australia's own page:

> The Australian Skills Classification (ASC) was decommissioned by Jobs and Skills Australia in December 2023, with the decommissioning process progressing through to the removal of the ASC from our website in January 2025.

Access is now by data access agreement, for research purposes only. Its replacement, the National Skills Taxonomy, is described as "currently developing" with no published dataset.

This is precisely the failure mode the brief warns against — *"data that would not realistically be available"* — and we would have discovered it only when trying to build against it.

### 3. Adzuna — Australian coverage is real, the text is not usable

Good news first: the Australian route exists. `GET /v1/api/jobs/au/search/1` returns **400** (missing credentials), not 404, so `au` is a supported country.

The blocker is response content. Adzuna's own documentation states:

> we currently only provide a snipped of the job description in the response

`open-questions.md` §5 asked exactly the right question — *"confirm the listing text is rich enough that skill extraction is actually possible, since some feeds return only a truncated summary"* — and the answer is no. Truncated snippets cannot support reliable skill extraction, and an LLM asked to extract requirements from an ellipsis-terminated paragraph will fill the gap by inventing, which is the hallucination failure the PRD commits to avoiding.

**Not used for skill extraction.** Adzuna remains available as a live per-listing feed for P1.

## What we use instead

### O*NET 31.0 — role content

- **Publisher:** U.S. Department of Labor, Employment and Training Administration
- **Licence:** Creative Commons Attribution 4.0 International — reuse permitted with attribution
- **Access:** direct download, no key required
- **Files used:** `Occupation Data`, `Task Statements`, `Essential Skills`, `Software Skills`

O*NET supplies what a role actually involves: core task statements, employer-rated skill importances, and concrete technologies. Two details make it a better fit than the roadmap source it replaces:

**The `Hot Technology` and `In Demand` flags.** O*NET lists hundreds of technologies per occupation, most long-tail (every compiler ever written). Filtering on O*NET's own currency flags reduces Software Developer from several hundred entries to 153 that employers actually ask for — AWS, Docker, Git, GitHub, Kafka, Terraform. This is the filter that stops the roadmap recommending Ada.

**It independently confirms the PRD's thesis.** `prd.md` §2 speculates that a student finishing Data Structures and Databases is missing "version control, a deployed project and one cloud service". Git, GitHub and AWS are the top-flagged technologies for Software Developers in O*NET. The example in the PRD was a guess; it is now evidenced.

**Known limitation:** O*NET is US labour-market data. It describes the *content* of a role well and transfers across borders — a software developer writes and reviews code in both countries — but it carries US framing. Australian specificity comes from the second source, deliberately.

### JSA Internet Vacancy Index — Australian demand

- **Publisher:** Jobs and Skills Australia (Australian Government)
- **Coverage:** monthly online job-ad counts by ANZSCO 4-digit occupation, by state and region, March 2006 – **July 2026**
- **Access:** direct `.xlsx` download

This is a strictly better answer than Adzuna for the demand question, and it is *Australian government data*, which scores directly against the rubric's *"demonstrates understanding of the Australian context"*.

What it lets the product say, with a citation rather than a vibe:

| Role | ANZSCO | Ads, Jul 2026 | Historic peak | Year-on-year |
| --- | --- | --- | --- | --- |
| Software Developer | 2613 | 3,049 | 8,753 | −17.0% |
| Data Analyst | 2611 | 1,743 | 5,103 | −9.4% |
| Data Engineer | 2621 | 533 | 1,900 | −11.9% |
| Cyber Security Analyst | 2621 | 533 | 1,900 | −11.9% |
| Web Developer | 2612 | 66 | 954 | −22.9% |

**This is a finding, not just a feature.** Every graduate technology role in Australia is down year-on-year and sitting far below its historic peak. It sharpens the problem statement considerably: the PRD argues students need to differentiate themselves beyond their degree, and the market data says the cost of failing to do so is rising. It also gives the events pillar a sharper rationale — when advertised roles contract, the referral channel matters more, not less.

It is also honest input to the product. A student targeting Web Developer should be told that ANZSCO 2612 is advertising 66 roles nationally this month. That is a real signal, and withholding it to keep the UI cheerful would be the wrong call.

**Known limitation — the ANZSCO join is imperfect, and we surface it.** ANZSCO's 4-digit structure predates most modern data roles. There is no "Data Scientist" code; ANZSCO 2621 bundles database administrators with ICT security specialists, so Data Engineer and Cyber Security Analyst necessarily share a demand figure. Each role in `src/data/roles.json` carries a `mappingConfidence` and a `mappingNote` recording this, and the UI shows the ANZSCO occupation the number actually describes rather than implying a precision the source does not have.

### Course and unit data

Per `open-questions.md` §2: two to three real Australian degrees seeded from public university handbooks, with manual entry as the universal fallback. Australian handbooks are public, so the production path (institutional integration) is credible.

### Events — still the weakest link

Unchanged from the PRD's own assessment. Humanitix's API endpoint exists (`api.humanitix.com/v1/events` returns 400 for missing auth) but it is organiser-scoped: it returns events belonging to the authenticated account, not a public cross-organiser search. That is not event discovery.

**Approach:** a hand-curated set of genuinely real, current Melbourne events with live links, labelled in the demo as a curated snapshot, with partnership-based integration described as the production path. `open-questions.md` §1 pre-approved this outcome and it is the right call — a snapshot of real data shown honestly costs nothing in the rubric.

## Standing rules

1. **No scraping of any site whose terms prohibit it**, for demo convenience or otherwise. A terms breach costs the "practical implementation" criterion outright.
2. **Every seeded record is real and attributed.** No invented job ads, no invented events, no invented units.
3. **Attribution ships with the product**, not just the docs. O*NET and JSA are both CC BY; the attribution requirement is a licence condition, so it appears in the UI.
4. **If the model cannot ground a claim in a supplied record, it is dropped rather than guessed.**

## Reproducing this

```bash
python3 scripts/etl/build_roles.py
```

Reads `data/sources/onet/` and `data/sources/jsa/` and writes `src/data/roles.json`. Source files are committed so the build is reproducible without network access and so the exact snapshot behind any demo is auditable.
