import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RouteHero } from "@/components/RouteHero";
import { Sparkline } from "@/components/Sparkline";
import { Eyebrow } from "@/components/ui";
import { roles, sources } from "@/lib/data";
import { formatNumber, formatSignedPercent } from "@/lib/utils";

const INPUTS = [
  {
    n: "01",
    title: "What you have",
    body: "The units you confirm, with the university's own description of each — never your name, background or nationality.",
    source: "UniMelb Handbook",
  },
  {
    n: "02",
    title: "What the role requires",
    body: "Tasks, skills and technologies the work actually involves, filtered to what employers flag as in demand.",
    source: "O*NET 31.0",
  },
  {
    n: "03",
    title: "How much Australia hires",
    body: "Monthly job-ad counts by occupation and state, so the demand figure is a real Australian number.",
    source: "JSA Internet Vacancy Index",
  },
  {
    n: "04",
    title: "How long you have",
    body: "Semesters remaining. The input that turns a flat list of gaps into a paced plan — and the one most tools ignore.",
    source: "You, at onboarding",
  },
];

export default function Home() {
  const headline = roles.find((r) => r.id === "software-developer") ?? roles[0];
  const demand = headline.demand;

  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------ hero -- */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-14 pt-14 sm:pt-20 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-6">
          <div className="fade-up">
            <Eyebrow className="mb-4">
              Melbourne · from first semester to graduation
            </Eyebrow>

            <h1 className="display text-[2.6rem] text-fg sm:text-6xl">
              Your degree, mapped to the job you actually want.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
              You finish Algorithms and Data Structures. Nobody tells you that puts
              you two thirds of the way to a backend internship — or that the
              missing third is version control, one deployed project and one cloud
              service. <span className="font-semibold text-fg">Onramp joins those dots</span>,
              paced to the semesters you have left.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/start"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-accent-fg shadow-sm transition-colors hover:bg-accent-hover"
              >
                Map my gap
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/method"
                className="inline-flex h-12 items-center rounded-md border border-border-strong bg-bg-raised px-6 text-base font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                How it works
              </Link>
            </div>

            <p className="mt-5 text-xs text-fg-subtle">
              Free — no account — your transcript never leaves your browser at rest
            </p>
          </div>

          <div className="fade-up [animation-delay:150ms]">
            <RouteHero
              roleTitle={headline.title}
              ads={formatNumber(demand?.latestAds)}
              month={demand?.latestMonth ?? ""}
              unitCodes={["COMP10001", "COMP20003"]}
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- market strip -- */}
      {demand && (
        <section className="border-b border-border bg-bg-subtle">
          <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-6 px-6 py-8 sm:grid-cols-[auto_auto_auto_1fr] sm:items-center">
            <Stat
              label={`${headline.title} ads, national`}
              value={formatNumber(demand.latestAds)}
              sub={demand.latestMonth}
            />
            <Stat
              label="Historic peak"
              value={formatNumber(demand.peakAds)}
              sub="the market has tightened"
            />
            <Stat
              label="Year on year"
              value={formatSignedPercent(demand.yearOnYearPct)}
              sub="fewer advertised roles"
              tone="gap"
            />
            <div className="sm:justify-self-end">
              <Sparkline
                data={demand.trend}
                width={220}
                height={44}
                label={`Five-year trend of ${headline.title} job ads`}
              />
              <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                5-year trend · {sources.roles.ivi.publisher}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ the four inputs */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Eyebrow className="mb-2">The mechanism</Eyebrow>
        <h2 className="display max-w-2xl text-3xl text-fg sm:text-4xl">
          Four inputs. The product is the join.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">
          &ldquo;COMP20003 Algorithms and Data Structures&rdquo; is not a string
          match for &ldquo;strong DSA fundamentals&rdquo;, but it is the same
          competency. Recognising that — and only that — is the AI&rsquo;s one job
          here. Everything else is checkable data.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {INPUTS.map((input) => (
            <div key={input.n} className="bg-bg-raised p-5">
              <span className="font-mono text-xs font-bold text-route-strong">
                {input.n}
              </span>
              <h3 className="mt-2 text-[15px] font-bold text-fg">{input.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{input.body}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {input.source}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ legend */}
      <section className="border-t border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Eyebrow className="mb-2">Road conditions</Eyebrow>
          <h2 className="display text-3xl text-fg">
            Three honest states, and the middle one is the point
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
            Most tools tell you what you are missing. The useful distinction is
            between a topic your degree covered properly and one it touched for a
            week — because the second is where students overestimate themselves.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <LegendCard
              tone="evidence"
              road="solid"
              title="Evidenced"
              body="Your coursework demonstrates this, and we can quote the unit description that says so."
            />
            <LegendCard
              tone="partial"
              road="half"
              title="Partial"
              body="Touched on, not demonstrated. Writing code in an assignment is not version control or deployment discipline."
            />
            <LegendCard
              tone="gap"
              road="dashed"
              title="Gap"
              body="Not covered by anything you have done — the roadworks your roadmap exists to finish."
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- closer -- */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
          <div>
            <h2 className="display text-2xl text-fg sm:text-3xl">
              Three minutes of input. A plan for every semester you have left.
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              Two worked examples included — a first-year and a final-year, same
              degree, same role, visibly different plans.
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-accent-fg shadow-sm transition-colors hover:bg-accent-hover"
          >
            Start now
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
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
    <div>
      <div className="eyebrow text-fg-subtle">{label}</div>
      <div
        className={`mt-1 font-mono text-[1.7rem] font-bold leading-none ${
          tone === "gap" ? "text-gap" : "text-fg"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-fg-muted">{sub}</div>
    </div>
  );
}

function LegendCard({
  tone,
  road,
  title,
  body,
}: {
  tone: "evidence" | "partial" | "gap";
  road: "solid" | "half" | "dashed";
  title: string;
  body: string;
}) {
  const color = {
    evidence: "var(--evidence)",
    partial: "var(--partial)",
    gap: "var(--gap)",
  }[tone];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-raised p-5">
      {/* the state drawn as a road surface, not just a dot — colourblind-safe */}
      <svg width="72" height="8" aria-hidden className="mb-3.5">
        <line
          x1="1"
          y1="4"
          x2="71"
          y2="4"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={road === "solid" ? undefined : road === "half" ? "26 8" : "8 8"}
        />
      </svg>
      <div className="text-[15px] font-bold text-fg">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
