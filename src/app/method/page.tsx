import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge, Card, CardBody } from "@/components/ui";
import { roles, sources } from "@/lib/data";

export const metadata = {
  title: "How Onramp works",
  description:
    "The four inputs, where each one comes from, what the model is and is not allowed to do, and what we know is wrong with it.",
};

const STEPS = [
  {
    n: "01",
    title: "What you have",
    body: "The units you confirm, with the university's own description of each one. Not your name, not your background, not your nationality — none of which are used anywhere in a recommendation.",
    source: "University of Melbourne Handbook, public course information",
  },
  {
    n: "02",
    title: "What the market wants",
    body: "The tasks, skills and technologies the role actually involves, filtered to what O*NET flags as in demand so the roadmap does not recommend a language nobody hires for.",
    source: "O*NET 31.0, U.S. Department of Labor — CC BY 4.0",
  },
  {
    n: "03",
    title: "How much of it Australia is hiring",
    body: "Monthly online job-ad counts by ANZSCO occupation and state, so the demand figure attached to a role is a real Australian number rather than a guess.",
    source: "Internet Vacancy Index, Jobs and Skills Australia — July 2026",
  },
  {
    n: "04",
    title: "How long you have",
    body: "Semesters remaining. This is what turns a flat list of gaps into a paced plan, and it is the input that makes a first-year's roadmap different from a final-year's.",
    source: "You, at onboarding",
  },
];

export default function MethodPage() {
  const demand = roles.find((r) => r.id === "software-developer")?.demand;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-balance">
          How it works, including the parts that do not
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">
          A product that tells students what to study should be able to explain
          itself. This page is the whole mechanism: the four inputs, what the model
          is allowed to do with them, and what we already know is wrong with it.
        </p>

        {/* ------------------------------------------------------ the join -- */}
        <h2 className="mt-12 text-xl font-semibold tracking-tight">
          Four inputs, and the product is the join
        </h2>
        <div className="mt-5 space-y-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <CardBody className="pt-5">
                <div className="flex gap-4">
                  <span className="font-mono text-sm text-fg-subtle">{s.n}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-fg">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                      {s.body}
                    </p>
                    <p className="mt-2 text-xs text-fg-subtle">Source: {s.source}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* --------------------------------------------------- the ai part -- */}
        <h2 className="mt-12 text-xl font-semibold tracking-tight">
          What the model actually does
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          One job: the semantic join.{" "}
          <span className="font-mono text-xs text-fg">
            COMP20003 Algorithms and Data Structures
          </span>{" "}
          is not a string match for &ldquo;strong DSA fundamentals&rdquo; in a job ad,
          or for &ldquo;Data Structures&rdquo; in a curriculum. It is the same
          competency, and recognising that is the one part of this problem that
          classical matching genuinely cannot do.
        </p>

        <div className="mt-5 space-y-3">
          <Rule
            label="Grounded, and checked in code"
            body="Every claim that you already have a capability must quote the unit description you confirmed. Citations that name a unit you did not list are dropped by the server before the page renders — this is a filter in the code, not an instruction in a prompt. The page tells you how many were dropped."
          />
          <Rule
            label="Structured output only"
            body="Both calls return a schema-validated object, so there is no free-text parsing and no way for prose to leak into the interface."
          />
          <Rule
            label="It recommends, it never decides"
            body="No score, no ranking of students, no gate. The brief warns against fully automated high-impact decisions without human review, and telling someone they are unsuited to a career is exactly that."
          />
          <Rule
            label="It never sees who you are"
            body="Name, background, visa status and nationality are not inputs to the matching or the roadmap. Same coursework, same stage, same target role must produce the same plan regardless of who is asking."
          />
        </div>

        {/* ------------------------------------------------------- limits -- */}
        <h2 className="mt-12 text-xl font-semibold tracking-tight">
          What is wrong with it
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Written down because a prototype that hides its limitations is harder to
          trust than one that names them.
        </p>

        <div className="mt-5 space-y-3">
          <Limit
            tone="gap"
            label="The ANZSCO mapping is approximate"
            body="ANZSCO's occupation codes predate most modern data roles. There is no Data Scientist code, and Data Engineer and Cyber Security Analyst necessarily share one, so they share a demand figure. Every role carries its mapping confidence, and the number is labelled with the occupation it actually describes."
          />
          <Limit
            tone="gap"
            label="Role content is US data"
            body="O*NET is the U.S. Department of Labor's occupational database. It describes what the work involves, which transfers well; the Australian specificity comes from the demand data, deliberately. Australia's own skills classification was decommissioned in 2023 and its replacement is not published yet."
          />
          <Limit
            tone="gap"
            label="Events are curated, not live"
            body="No public API offers cross-organiser event discovery in Australia. These are real Melbourne communities with live links, verified by hand — but the next session date comes from following the link, not from us."
          />
          <Limit
            tone="gap"
            label="Two degrees, one city"
            body="Coverage is deliberately narrow and real rather than broad and invented. Anything outside it goes through manual entry, which works but gives the matcher less to reason about — so it is told to be more cautious about units it has no description for."
          />
        </div>

        {demand && (
          <div className="mt-12 rounded-[var(--radius)] border border-border bg-bg-subtle p-5">
            <Badge tone="neutral" className="mb-3">
              A number you can check
            </Badge>
            <p className="text-sm leading-relaxed text-fg-muted">
              Software and Applications Programmers (ANZSCO 2613) advertised{" "}
              <span className="font-mono text-fg">{demand.latestAds}</span> roles
              nationally in {demand.latestMonth}, against a historic peak of{" "}
              <span className="font-mono text-fg">{demand.peakAds}</span>. Every
              technology role we cover is down year on year. That is the argument for
              the product rather than a detail of it: when advertised roles contract,
              differentiating yourself and reaching people directly matters more, not
              less.
            </p>
            <p className="mt-3 text-xs text-fg-subtle">
              {sources.roles.ivi.publisher}, {sources.roles.ivi.version}.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Rule({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <h3 className="text-sm font-semibold text-fg">{label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function Limit({
  label,
  body,
}: {
  tone: "gap";
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-gap-border bg-gap-subtle p-4">
      <h3 className="text-sm font-semibold text-fg">{label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
