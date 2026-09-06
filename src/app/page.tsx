import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FieldCanvas } from "@/components/FieldCanvas";
import { MarketCharts } from "@/components/MarketCharts";
import { Eyebrow } from "@/components/ui";
import { roles, sources } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

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

const LOOP = [
  { k: "Map", d: "Your transcript against the role, every claim quoted from the handbook." },
  { k: "Plan", d: "The gap becomes semesters, paced to the time you actually have." },
  { k: "Study", d: "A tutor scoped to the step you are on — it teaches, it does not do." },
  { k: "Show up", d: "Ranked rooms, on your calendar, never on top of a class." },
  { k: "Interview", d: "Practise aloud against the role's real requirements. Debrief, not score." },
];

export default function Home() {
  const headline = roles.find((r) => r.id === "software-developer") ?? roles[0];
  const demand = headline.demand;

  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------ hero -- */}
      <section className="relative min-h-[92vh] overflow-hidden border-b border-border">
        <FieldCanvas className="absolute inset-0 h-full w-full" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-6 py-20">
          <Eyebrow className="mb-5">
            Melbourne · from first semester to graduation
          </Eyebrow>

          <h1 className="display max-w-3xl text-5xl text-fg sm:text-7xl">
            Every dot is a student without a map.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-muted">
            You finish Algorithms and Data Structures. Nobody tells you that puts
            you two thirds of the way to a backend internship.{" "}
            <span className="font-semibold text-fg">Onramp joins those dots</span> —
            your transcript, the market&rsquo;s real numbers, and the semesters you
            have left, on one route.
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
              className="inline-flex h-12 items-center rounded-md border border-border-strong bg-bg-raised/80 px-6 text-base font-semibold text-fg backdrop-blur-sm transition-colors hover:bg-bg-subtle"
            >
              How it works
            </Link>
          </div>

          {/* FIELD-style HUD */}
          <div className="pointer-events-none absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            <span>24,200 particles · 48 glyphs of maths and code · zero assets · scroll to merge onto the route</span>
            <span>
              {demand ? `${formatNumber(demand.latestAds)} ${headline.title} ads · ${demand.latestMonth}` : ""}
            </span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- market -- */}
      <section className="border-b border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Eyebrow className="mb-2">The market, unhidden</Eyebrow>
          <h2 className="display max-w-2xl text-3xl text-fg sm:text-5xl">
            Five roles, sixty months, every number checkable.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">
            Advertised roles are down across every technology occupation we cover.
            That is not a reason to despair — it is the reason a first-year should
            start now, and the reason showing up in person beats one more cold
            application.
          </p>

          <div className="mt-10">
            <MarketCharts roles={roles} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ the four inputs */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <Eyebrow className="mb-2">The mechanism</Eyebrow>
        <h2 className="display max-w-2xl text-3xl text-fg sm:text-5xl">
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

      {/* ------------------------------------------------------- the loop -- */}
      <section className="border-t border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Eyebrow className="mb-2">Not a report — a loop</Eyebrow>
          <h2 className="display max-w-2xl text-3xl text-fg sm:text-5xl">
            From gap to room to offer, one product.
          </h2>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {LOOP.map((step, i) => (
              <li key={step.k} className="bg-bg-raised p-5">
                <span className="flex size-7 items-center justify-center rounded-[5px] border-2 border-route-fg/60 bg-route font-mono text-xs font-bold text-route-fg">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-[15px] font-bold text-fg">{step.k}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <LegendCard
              tone="evidence"
              road="solid"
              title="Evidenced"
              body="Your coursework demonstrates this, quoted from the unit description."
            />
            <LegendCard
              tone="partial"
              road="half"
              title="Partial"
              body="Touched on, not demonstrated — where students overestimate themselves."
            />
            <LegendCard
              tone="gap"
              road="dashed"
              title="Gap"
              body="The roadworks your roadmap exists to finish."
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- closer -- */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
          <div>
            <h2 className="display text-2xl text-fg sm:text-4xl">
              Three minutes of input. A plan for every semester you have left.
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              Two worked examples included — a first-year and a final-year, same
              degree, same role, visibly different plans. Source for everything:{" "}
              {sources.roles.ivi.publisher}, O*NET, the university handbook.
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
