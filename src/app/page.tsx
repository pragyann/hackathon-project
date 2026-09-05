import Link from "next/link";
import { ArrowRight, Compass, GitBranch, Users } from "lucide-react";

import { Badge, Button, Card, CardBody } from "@/components/ui";
import { roles, sources } from "@/lib/data";
import { formatNumber, formatSignedPercent } from "@/lib/utils";

const PILLARS = [
  {
    icon: GitBranch,
    title: "Start from what you have already done",
    body: "Every recommendation is traced to a unit you actually completed, quoting the university's own description of it. A roadmap that ignores your transcript is the thing we are replacing.",
  },
  {
    icon: Compass,
    title: "Paced to the time you have left",
    body: "A first-year with six semesters and a final-year with one get genuinely different plans from the same gap. Foundations and habits early; triage against a deadline late.",
  },
  {
    icon: Users,
    title: "Ends in a conversation, not a certificate",
    body: "Real Melbourne communities, ranked against your roadmap and your stage — because a first-year sent to a senior architects' dinner never goes to a second event.",
  },
];

export default function Home() {
  const headline = roles.find((r) => r.id === "software-developer") ?? roles[0];
  const demand = headline.demand;

  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------ hero -- */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(60rem 30rem at 15% -10%, var(--accent-subtle), transparent 60%), radial-gradient(45rem 25rem at 95% 10%, var(--evidence-subtle), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <Badge tone="accent" className="mb-6">
            Track 2 — Education and Student Success
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-fg max-w-3xl text-balance">
            Your degree, mapped to the job you actually want.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-fg-muted leading-relaxed">
            You finish Algorithms and Data Structures. Nobody tells you that puts
            you two thirds of the way to a backend internship, or that the missing
            third is version control, one deployed project and one cloud service.{" "}
            <span className="text-fg">Onramp joins those dots</span> — from first
            semester to graduation, not in a panic in final year.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/start">
              <Button size="lg">
                Map my gap
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/method">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </Link>
          </div>

          {/* Real data, on the first screen, because the claim is checkable. */}
          {demand && (
            <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
              <Stat
                label={`${headline.title} ads in Australia`}
                value={formatNumber(demand.latestAds)}
                sub={demand.latestMonth}
              />
              <Stat
                label="Against its historic peak"
                value={formatNumber(demand.peakAds)}
                sub="the market has tightened"
              />
              <Stat
                label="Year on year"
                value={formatSignedPercent(demand.yearOnYearPct)}
                sub="fewer advertised roles"
                tone="gap"
              />
            </div>
          )}
          <p className="mt-3 text-xs text-fg-subtle">
            Source: {sources.roles.ivi.publisher}, {sources.roles.ivi.version}. Every
            number in this product comes from a named open dataset.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- pillars -- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardBody className="pt-5">
                <div className="mb-4 inline-flex size-9 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <Icon className="size-4.5" aria-hidden />
                </div>
                <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ legend */}
      <section className="border-t border-border bg-bg-subtle">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-xl font-semibold tracking-tight">
            Three honest states, and the middle one is the point
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
            Most tools tell you what you are missing. The useful distinction is
            between a topic your degree covered properly and one it touched for a
            week — because the second is where students overestimate themselves.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <LegendCard
              tone="evidence"
              title="Evidenced"
              body="Your coursework demonstrates this, and we can quote the unit description that says so."
            />
            <LegendCard
              tone="partial"
              title="Partial"
              body="Touched on, not demonstrated. Writing code in an assignment is not the same as version control or deployment discipline."
            />
            <LegendCard
              tone="gap"
              title="Gap"
              body="Not covered by anything you have done. This is what the roadmap is for."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-fg-subtle space-y-1">
          <p>
            Role content from O*NET 31.0 by the U.S. Department of Labor, Employment
            and Training Administration, used under CC BY 4.0. Australian demand data
            from Jobs and Skills Australia. Unit content from the University of
            Melbourne Handbook.
          </p>
          <p>
            Onramp recommends; you decide. Nothing here scores, ranks or gates a
            student, and no recommendation uses your name, background or nationality.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "gap";
}) {
  return (
    <div className="bg-bg-raised px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
      <div
        className={`mt-1.5 font-mono text-2xl font-semibold ${
          tone === "gap" ? "text-gap" : "text-fg"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-fg-muted">{sub}</div>
    </div>
  );
}

function LegendCard({
  tone,
  title,
  body,
}: {
  tone: "evidence" | "partial" | "gap";
  title: string;
  body: string;
}) {
  const ring = {
    evidence: "border-evidence-border bg-evidence-subtle",
    partial: "border-partial-border bg-partial-subtle",
    gap: "border-gap-border bg-gap-subtle",
  }[tone];
  const dot = { evidence: "bg-evidence", partial: "bg-partial", gap: "bg-gap" }[tone];

  return (
    <div className={`rounded-[var(--radius)] border p-4 ${ring}`}>
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <span className="text-sm font-semibold text-fg">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
