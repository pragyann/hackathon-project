# Technical documentation

Architecture, data model, integrations and technical decisions. Mostly empty by design: the stack should not be chosen until the scope in [../product/prd.md](../product/prd.md) is locked and the data-source questions in [../product/open-questions.md](../product/open-questions.md) are answered with real API calls.

## Planned contents

| File | Purpose | Status |
| --- | --- | --- |
| `architecture.md` | Component diagram, how the pieces fit, request flow | Not started |
| `data-sources.md` | Per-integration notes: endpoints, auth, rate limits, terms, verification results | Not started, and this is the first thing to write |
| `data-model.md` | Core entities: student, unit, skill, role, roadmap step, event | Not started |
| `ai-design.md` | Where the model is used, prompts, grounding strategy, hallucination controls, evaluation approach | Not started |
| `decisions.md` | Running log of technical decisions and their reasoning | Not started |

## What the judging rubric wants from this folder

35% of the score is Prototype and Technical Execution, and two of its bullets are about explanation rather than code: *"demonstrates understanding and ownership of the technical approach and AI-generated outputs"* and *"explains how key components, technologies and data work together"*. A fifth bullet is *"demonstrates testing and awareness of key technical limitations or risks"*.

That has a direct consequence for how this project gets built: whoever accepts AI-generated code needs to be able to explain it under questioning, and the known limitations need writing down as they are discovered rather than reconstructed the night before the pitch. `decisions.md` and the limitations section of `architecture.md` are pitch inputs, not documentation chores.

## First technical task

Before any application code: verify the four external data dependencies with real calls and record the results in `data-sources.md`. Job listings, networking events, course handbook data, industry roadmaps. Two of these could invalidate a product pillar, and finding that out on day one is cheap while finding it out on day two is not.
