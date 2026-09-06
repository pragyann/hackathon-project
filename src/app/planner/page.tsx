"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Trash2,
} from "lucide-react";

import { Button, Card, CardBody, Eyebrow, Input, Select, Skeleton } from "@/components/ui";
import {
  buildICS,
  conflictsFor,
  DAY_NAMES,
  formatHour,
  formatPlanDate,
  toISODate,
  weekdayOf,
} from "@/lib/calendar";
import { getEvent } from "@/lib/data";
import { saveProfile, useHydrated, useStoredAnalysis, useStoredProfile } from "@/lib/store";
import type { ClassBlock, EventPlan, StudentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The study-safe calendar: a month of your life with classes as the fixed
 * terrain, accepted events placed around them, clashes loud, and the
 * roadmap's progress ring keeping score. Networking should never cost a unit.
 */
export default function PlannerPage() {
  const ready = useHydrated();
  const profile = useStoredProfile();
  const analysis = useStoredAnalysis();

  const today = toISODate(new Date());
  const [selected, setSelected] = useState(today);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const plans = useMemo(
    () =>
      [...(profile?.eventPlans ?? [])].sort((a, b) =>
        `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
      ),
    [profile],
  );

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-6 py-24 text-center">
        <Eyebrow className="mb-3">No calendar yet</Eyebrow>
        <h1 className="display text-3xl text-fg">Start with your plan</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Once you have a roadmap, events you accept land here — checked against
          your class timetable so networking never eats study.
        </p>
        <Link href="/start" className="mt-6 inline-block">
          <Button size="lg">Get started</Button>
        </Link>
      </main>
    );
  }

  const clashCount = plans.filter((p) => conflictsFor(p, profile.classBlocks).length > 0).length;

  // roadmap progress ring
  const allSteps = analysis?.roadmap?.semesters.flatMap((s) => s.steps) ?? [];
  const doneSteps = allSteps.filter((s) => profile.completedStepIds.includes(s.id));
  const pct = allSteps.length ? Math.round((doneSteps.length / allSteps.length) * 100) : 0;

  function downloadICS() {
    const blob = new Blob([buildICS(plans, getEvent)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "onramp-events.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow className="mb-1.5">Study-safe scheduling</Eyebrow>
            <h1 className="display text-4xl text-fg">Your semester, on one page</h1>
          </div>
          <Button variant="secondary" onClick={downloadICS} disabled={plans.length === 0}>
            <Download className="size-4" aria-hidden />
            Export .ics
          </Button>
        </div>

        {clashCount > 0 && (
          <div className="mt-5 flex items-center gap-2.5 rounded-md border border-dashed border-gap-border bg-gap-subtle px-4 py-2.5 text-sm font-semibold text-gap">
            <AlertTriangle className="size-4" aria-hidden />
            {clashCount === 1
              ? "1 accepted event clashes with a class"
              : `${clashCount} accepted events clash with classes`}{" "}
            — pick another session from the organiser&rsquo;s listing.
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* -------------------------------------------------- month view -- */}
          <section>
            <MonthCal
              anchor={monthAnchor}
              onAnchor={setMonthAnchor}
              selected={selected}
              onSelect={setSelected}
              today={today}
              profile={profile}
              plans={plans}
            />
            <DayPanel date={selected} profile={profile} plans={plans} />
          </section>

          {/* ------------------------------------------- ring · stats · load -- */}
          <section className="space-y-8">
            <div className="flex items-center gap-6 rounded-[var(--radius)] border border-border bg-bg-raised p-5">
              <Ring pct={pct} />
              <div>
                <p className="eyebrow text-fg-subtle">Roadmap progress</p>
                {allSteps.length ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-fg">
                      {doneSteps.length} of {allSteps.length} steps done
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                      Ticked on your{" "}
                      <Link href="/plan?tab=roadmap" className="font-medium text-accent hover:underline">
                        roadmap
                      </Link>{" "}
                      — this ring is what the semester loop comes back to.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-fg-muted">
                    Run your{" "}
                    <Link href="/plan" className="font-medium text-accent hover:underline">
                      gap analysis
                    </Link>{" "}
                    and the ring starts counting.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border">
              <StatTile label="events accepted" value={String(plans.length)} />
              <StatTile label="clashes" value={String(clashCount)} tone={clashCount ? "gap" : undefined} />
              <StatTile
                label="class hours / week"
                value={profile.classBlocks
                  .reduce((n, b) => n + (b.end - b.start), 0)
                  .toLocaleString("en-AU")}
              />
            </div>

            <figure>
              <figcaption>
                <Eyebrow>Semester load · next 12 weeks</Eyebrow>
                <p className="mt-1 text-xs text-fg-muted">
                  One cell per day; darker means more committed hours (classes + events).
                </p>
              </figcaption>
              <LoadHeatmap profile={profile} plans={plans} />
            </figure>
          </section>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* ------------------------------------------------ class editor -- */}
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">
              Your weekly classes
            </h2>
            <p className="mt-1.5 text-xs text-fg-muted">
              The fixed terrain everything else routes around. Stored in your browser
              like the rest of your profile.
            </p>
            <ClassEditor
              blocks={profile.classBlocks}
              onChange={(classBlocks) => saveProfile({ ...profile, classBlocks })}
            />
          </section>

          {/* --------------------------------------------------- upcoming -- */}
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">
              Events you are going to
            </h2>
            {plans.filter((p) => p.date >= today).length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-border p-4 text-xs text-fg-subtle">
                Nothing yet. Accept an event from your{" "}
                <Link href="/plan?tab=events" className="font-medium text-accent hover:underline">
                  ranked list
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {plans
                  .filter((p) => p.date >= today)
                  .map((p) => {
                    const event = getEvent(p.eventId);
                    const clashes = conflictsFor(p, profile.classBlocks);
                    return (
                      <li
                        key={`${p.eventId}-${p.date}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5",
                          clashes.length
                            ? "border-dashed border-gap-border bg-gap-subtle"
                            : "border-border bg-bg-raised",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-fg">
                            {event?.name ?? p.eventId}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-fg-muted">
                            {formatPlanDate(p.date)} · {formatHour(p.start)}–
                            {formatHour(p.start + p.durationHours)}
                          </p>
                          {clashes.length > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gap">
                              <AlertTriangle className="size-3" aria-hidden />
                              Clashes with {clashes[0].label}
                            </p>
                          )}
                        </div>
                        <button
                          aria-label={`Remove ${event?.name ?? p.eventId}`}
                          onClick={() =>
                            saveProfile({
                              ...profile,
                              eventPlans: profile.eventPlans.filter((x) => x !== p),
                            })
                          }
                          className="rounded p-1 text-fg-subtle hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------- month view -- */

function MonthCal({
  anchor,
  onAnchor,
  selected,
  onSelect,
  today,
  profile,
  plans,
}: {
  anchor: Date;
  onAnchor: (d: Date) => void;
  selected: string;
  onSelect: (iso: string) => void;
  today: string;
  profile: StudentProfile;
  plans: EventPlan[];
}) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - startOffset + i);
    return d;
  });

  const plansByDate = new Map<string, EventPlan[]>();
  for (const p of plans) {
    plansByDate.set(p.date, [...(plansByDate.get(p.date) ?? []), p]);
  }

  const shift = (delta: number) => {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + delta);
    onAnchor(d);
  };

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-raised p-5">
      <div className="flex items-center justify-between">
        <h2 className="display text-2xl text-fg">
          {anchor.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              onAnchor(d);
              onSelect(today);
            }}
          >
            Today
          </Button>
          <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="pb-2 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            {d[0]}
          </div>
        ))}
        {cells.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === month;
          const dayPlans = plansByDate.get(iso) ?? [];
          const hasClash = dayPlans.some((p) => conflictsFor(p, profile.classBlocks).length > 0);
          const isSel = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              aria-label={`${d.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}${
                dayPlans.length ? `, ${dayPlans.length} event${dayPlans.length > 1 ? "s" : ""}` : ""
              }`}
              aria-pressed={isSel}
              className={cn(
                "relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-md text-sm transition-colors",
                inMonth ? "text-fg" : "text-fg-subtle/50",
                isSel
                  ? "border-2 border-accent font-bold"
                  : isToday
                    ? "font-bold text-route-fg"
                    : "hover:bg-bg-subtle",
              )}
            >
              {d.getDate()}
              {(dayPlans.length > 0 || isToday) && (
                <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>
                  {dayPlans.slice(0, 3).map((p, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full",
                        conflictsFor(p, profile.classBlocks).length ? "bg-gap" : "bg-route-strong",
                      )}
                    />
                  ))}
                  {dayPlans.length === 0 && isToday && (
                    <span className="size-1.5 rounded-full bg-border-strong" />
                  )}
                </span>
              )}
              {hasClash && isSel && <span className="sr-only">has a timetable clash</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-route-strong" aria-hidden /> event
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-gap" aria-hidden /> clashes with a class
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ day panel -- */

function DayPanel({
  date,
  profile,
  plans,
}: {
  date: string;
  profile: StudentProfile;
  plans: EventPlan[];
}) {
  const day = weekdayOf(date);
  const classes = profile.classBlocks
    .filter((b) => b.day === day)
    .sort((a, b) => a.start - b.start);
  const dayPlans = plans.filter((p) => p.date === date);

  const items = [
    ...classes.map((c) => ({ kind: "class" as const, start: c.start, end: c.end, label: c.label })),
    ...dayPlans.map((p) => ({
      kind: conflictsFor(p, profile.classBlocks).length ? ("clash" as const) : ("event" as const),
      start: p.start,
      end: p.start + p.durationHours,
      label: getEvent(p.eventId)?.name ?? p.eventId,
    })),
  ].sort((a, b) => a.start - b.start);

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-bg-raised p-5">
      <h3 className="display text-xl text-fg">
        {new Date(`${date}T00:00:00`).toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">
          Clear. A clear day is not an empty day — it is where a roadmap step fits.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
                it.kind === "class" && "border-partial-border bg-partial-subtle",
                it.kind === "event" && "border-route-strong/50 bg-route-subtle",
                it.kind === "clash" && "border-dashed border-gap-border bg-gap-subtle",
              )}
            >
              <span className="w-24 shrink-0 font-mono text-[11px] text-fg-muted">
                {formatHour(it.start)}–{formatHour(it.end)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-fg">{it.label}</span>
              {it.kind === "clash" && (
                <AlertTriangle className="size-3.5 shrink-0 text-gap" aria-label="Clashes with a class" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- ring -- */

function Ring({ pct }: { pct: number }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={`${pct}% of roadmap steps done`}>
      <circle cx="46" cy="46" r={R} fill="none" stroke="var(--bg-subtle)" strokeWidth="9" />
      <circle
        cx="46"
        cy="46"
        r={R}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct / 100)}
        transform="rotate(-90 46 46)"
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)" }}
      />
      <text x="46" y="51" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--fg)" fontFamily="var(--font-sans-var)">
        {pct}%
      </text>
    </svg>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "gap" }) {
  return (
    <div className="bg-bg-raised px-4 py-3.5">
      <div className={cn("font-mono text-2xl font-bold leading-none", tone === "gap" ? "text-gap" : "text-fg")}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-fg-muted">{label}</div>
    </div>
  );
}

/* -------------------------------------------------------- load heatmap -- */

function LoadHeatmap({ profile, plans }: { profile: StudentProfile; plans: EventPlan[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // this Monday

  const weeks = 12;
  const cells: { iso: string; hours: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { iso: string; hours: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + w * 7 + d);
      const iso = toISODate(date);
      const classHours = profile.classBlocks
        .filter((b) => b.day === d)
        .reduce((n, b) => n + (b.end - b.start), 0);
      const eventHours = plans
        .filter((p) => p.date === iso)
        .reduce((n, p) => n + p.durationHours, 0);
      col.push({ iso, hours: classHours + eventHours });
    }
    cells.push(col);
  }
  const max = Math.max(1, ...cells.flat().map((c) => c.hours));

  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {cells.map((col, w) => (
          <div key={w} className="flex flex-1 flex-col gap-1">
            {col.map((c, d) => (
              <div
                key={d}
                title={`${formatPlanDate(c.iso)}: ${c.hours}h committed`}
                className="aspect-square w-full rounded-[3px]"
                style={{
                  background:
                    c.hours === 0
                      ? "var(--bg-subtle)"
                      : `color-mix(in oklch, var(--accent) ${20 + (c.hours / max) * 70}%, var(--bg-subtle))`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        <span>this week</span>
        <span>+12 weeks</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- class editor -- */

function ClassEditor({
  blocks,
  onChange,
}: {
  blocks: ClassBlock[];
  onChange: (blocks: ClassBlock[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [day, setDay] = useState(0);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");

  const toHour = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  return (
    <Card className="mt-3">
      <CardBody className="pt-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-fg">
            Unit or label
            <Input
              className="mt-1 h-9 w-40"
              placeholder="COMP20003 lecture"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-fg">
            Day
            <Select className="mt-1 h-9 w-24" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs font-semibold text-fg">
            From
            <Input type="time" className="mt-1 h-9 w-27" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-fg">
            To
            <Input type="time" className="mt-1 h-9 w-27" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={!label.trim() || toHour(end) <= toHour(start)}
            onClick={() => {
              onChange([
                ...blocks,
                { id: `${Date.now()}`, day, start: toHour(start), end: toHour(end), label: label.trim() },
              ]);
              setLabel("");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>

        {blocks.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {[...blocks]
              .sort((a, b) => a.day - b.day || a.start - b.start)
              .map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded border border-border bg-bg-subtle px-3 py-1.5 text-xs"
                >
                  <span>
                    <span className="font-semibold text-fg">{b.label}</span>{" "}
                    <span className="font-mono text-fg-muted">
                      {DAY_NAMES[b.day]} {formatHour(b.start)}–{formatHour(b.end)}
                    </span>
                  </span>
                  <button
                    aria-label={`Remove ${b.label}`}
                    onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}
                    className="rounded p-0.5 text-fg-subtle hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
