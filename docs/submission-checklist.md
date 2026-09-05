# Submission checklist

Every requirement the organisers state, and where we stand. Source: [hackathon-spec/challenge-brief.md](hackathon-spec/challenge-brief.md).

## The 7 submission requirements

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 1 | Problem statement | Done | [prd.md §2, §3](product/prd.md) |
| 2 | Proposed solution | Done | [prd.md §5](product/prd.md) |
| 3 | Prototype or proof of concept | **Not started** | - |
| 4 | Technology overview | **Not started** | [technical/](technical/) is empty |
| 5 | Implementation plan | Done | [prd.md §10](product/prd.md) |
| 6 | Impact measurement | Done | [prd.md §9](product/prd.md) |
| 7 | Pitch slides + demo | **Not started** | - |

Only two things are actually submitted: **pitch slides (PDF/PPTX)** and **a demo**. Everything else exists to feed those two.

## "Strong submissions will demonstrate" (7 stated criteria)

| Criterion | Status |
| --- | --- |
| A clearly defined user problem | Done |
| **Evidence that the problem is important** | **Partial.** We cite the organisers' own statistics back at them. No primary evidence. See gap 1 below. |
| A focused and realistic solution | Done, scope split into P0/P1/P2 |
| A working prototype or convincing proof of concept | Not started |
| A clear explanation of how the technology works | Not started |
| Consideration of implementation, privacy, fairness, accessibility | Done in writing, unverified in build |
| A measurable benefit | Done |

## Key constraints

| Constraint | Status |
| --- | --- |
| Privacy and data protection | Addressed in [prd.md §8](product/prd.md) |
| Bias and fairness | Addressed, with a name/nationality invariance test we have committed to running |
| Transparency | Addressed, and built in as feature P0-7 |
| Security | **Not addressed.** Needs a paragraph once the stack exists |
| Appropriate human oversight | Addressed |
| Accessibility and inclusion | Stated as a principle. Must be verified in the actual UI |
| Practical implementation | Addressed |

**Avoid-list check:** unavailable data (our biggest live risk, see [open-questions.md](product/open-questions.md)); unreasonable budgets (fine); unexplainable technology (P0-7 covers it); fully automated high-impact decisions (explicitly out of scope).

## Gaps that need action

1. **No primary evidence for the problem.** We are quoting the organisers' statistics back to them, which every team will do. Talking to 5-10 actual students and quoting them in the pitch would be cheap and would separate us on the 15% Problem and User Understanding criterion. A single real quote beats three more statistics.
2. **Nothing built.** 35% of the score.
3. **No technology overview.** Two rubric bullets are about *explaining* the tech, not writing it.
4. **No testing story.** The rubric explicitly asks for "demonstrates testing and awareness of key technical limitations or risks." Needs to be deliberate, not retrofitted.
5. **Security not addressed** in the responsible-AI section.
6. **Data sources unverified.** Two of the four could invalidate a product pillar. This is the first technical task.
7. **Team roles unassigned.** The brief wants 4-5 people covering product, technical build, data/AI, and business communication.

## Pitch structure the organisers recommend

5 minutes, then 5-10 minutes of questions. Judges may cut you off at time.

1. The problem. 2. The target user. 3. The proposed solution. 4. The prototype demonstration. 5. The technology. 6. The expected impact. 7. Implementation and next steps.
