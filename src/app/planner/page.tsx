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
  mondayOf,
  toISODate,
  weekdayOf,
} from "@/lib/calendar";
import { getEvent } from "@/lib/data";
import { saveProfile, useHydrated, useStoredProfile } from "@/lib/store";
import type { ClassBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID_START = 8; // 8am
const GRID_END = 22; // 10pm
const HOUR_PX = 36;

/**
 * The study-safe calendar. Networking only helps if it does not eat the
 * degree that makes it worth doing, so accepted events sit on the same grid
 * as the student's classes and clashes are loud.
 */
export default function PlannerPage() {
  const ready = useHydrated();
  const profile = useStoredProfile();
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = useMemo(() => {
    const m = mondayOf(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return toISODate(d);
      }),
    [monday],
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
        <h1 className="display text-2xl text-fg">Start with your plan</h1>
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

  const plans = [...profile.eventPlans].sort((a, b) =>
    `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
  );
  const upcoming = plans.filter((p) => p.date >= toISODate(new Date()));
  const clashCount = plans.filter((p) => conflictsFor(p, profile.classBlocks).length > 0).length;

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
            <h1 className="display text-3xl text-fg">Your calendar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Classes first, events around them. Accept an event on your{" "}
              <Link href="/plan?tab=events" className="font-medium text-accent hover:underline">
                events list
              </Link>{" "}
              and it lands here, checked against your timetable —{" "}
              <span className="text-fg">networking should never cost you a unit</span>.
            </p>
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

        {/* ------------------------------------------------------ the week -- */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">
            Week of {monday.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              Today
            </Button>
            <Button variant="ghost" size="sm" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="scroll-x mt-3 rounded-[var(--radius)] border border-border bg-bg-raised">
          <div className="grid min-w-[720px] grid-cols-[3rem_repeat(7,1fr)]">
            <div />
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "border-b border-l border-border px-2 py-2 text-center text-xs font-bold",
                  weekDates[i] === toISODate(new Date()) ? "text-route-strong" : "text-fg-muted",
                )}
              >
                {d} {Number(weekDates[i].slice(8))}
              </div>
            ))}

            {/* hour labels */}
            <div className="relative" style={{ height: (GRID_END - GRID_START) * HOUR_PX }}>
              {Array.from({ length: GRID_END - GRID_START }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-fg-subtle"
                  style={{ top: i * HOUR_PX }}
                >
                  {i > 0 && formatHour(GRID_START + i)}
                </div>
              ))}
            </div>

            {DAY_NAMES.map((_, day) => (
              <div
                key={day}
                className="relative border-l border-border"
                style={{ height: (GRID_END - GRID_START) * HOUR_PX }}
              >
                {Array.from({ length: GRID_END - GRID_START - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: (i + 1) * HOUR_PX }}
                    aria-hidden
                  />
                ))}

                {/* classes: the fixed terrain */}
                {profile.classBlocks
                  .filter((b) => b.day === day)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="absolute inset-x-1 overflow-hidden rounded border border-partial-border bg-partial-subtle px-1.5 py-1"
                      style={{
                        top: (b.start - GRID_START) * HOUR_PX,
                        height: (b.end - b.start) * HOUR_PX - 2,
                      }}
                    >
                      <p className="truncate text-[11px] font-bold leading-tight text-partial">{b.label}</p>
                      <p className="font-mono text-[9.5px] text-fg-subtle">
                        {formatHour(b.start)}–{formatHour(b.end)}
                      </p>
                    </div>
                  ))}

                {/* accepted events on this week's dates */}
                {plans
                  .filter((p) => weekdayOf(p.date) === day && p.date === weekDates[day])
                  .map((p) => {
                    const event = getEvent(p.eventId);
                    const clash = conflictsFor(p, profile.classBlocks).length > 0;
                    return (
                      <div
                        key={p.eventId}
                        className={cn(
                          "absolute inset-x-1 overflow-hidden rounded border px-1.5 py-1",
                          clash
                            ? "border-dashed border-gap bg-gap-subtle"
                            : "border-route-strong/60 bg-route-subtle",
                        )}
                        style={{
                          top: (p.start - GRID_START) * HOUR_PX,
                          height: p.durationHours * HOUR_PX - 2,
                        }}
                      >
                        <p className={cn("truncate text-[11px] font-bold leading-tight", clash ? "text-gap" : "text-route-fg")}>
                          {event?.name ?? p.eventId}
                        </p>
                        <p className="font-mono text-[9.5px] text-fg-subtle">{formatHour(p.start)}</p>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
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
            {upcoming.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-border p-4 text-xs text-fg-subtle">
                Nothing yet. Accept an event from your{" "}
                <Link href="/plan?tab=events" className="font-medium text-accent hover:underline">
                  ranked list
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.map((p) => {
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
