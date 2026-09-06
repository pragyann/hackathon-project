"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  Users,
  X,
} from "lucide-react";

import { Badge, Button, Input } from "@/components/ui";
import { conflictsFor, formatHour, formatPlanDate, toISODate } from "@/lib/calendar";
import type { RankedEvent } from "@/lib/data";
import { saveProfile, useStoredProfile } from "@/lib/store";
import type { EventPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGE_COPY = {
  ideal: { tone: "evidence" as const, label: "Good fit for your stage" },
  reachable: { tone: "neutral" as const, label: "Worth a look" },
  advanced: { tone: "gap" as const, label: "Save for later" },
};

export function EventList({ ranked }: { ranked: RankedEvent[] }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const primary = ranked.filter((r) => r.stageFit !== "advanced");
  const advanced = ranked.filter((r) => r.stageFit === "advanced");

  return (
    <div>
      <ul className="space-y-2.5">
        {primary.map((r) => (
          <li key={r.event.id}>
            <EventCard ranked={r} />
          </li>
        ))}
      </ul>

      {/* Not hidden, but not mixed in either. prd.md §5.3: sending an early
          student to a senior room is worse than recommending nothing — but
          concealing that the room exists is patronising. */}
      {advanced.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
            className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", showAdvanced && "rotate-180")}
              aria-hidden
            />
            {advanced.length} more aimed at experienced practitioners
          </button>
          {showAdvanced && (
            <ul className="mt-3 space-y-2.5">
              {advanced.map((r) => (
                <li key={r.event.id}>
                  <EventCard ranked={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ ranked }: { ranked: RankedEvent }) {
  const [open, setOpen] = useState(false);
  const [planning, setPlanning] = useState(false);
  const { event, reasons, contributions, stageFit } = ranked;
  const stage = STAGE_COPY[stageFit];

  const profile = useStoredProfile();
  const plan = profile?.eventPlans.find((p) => p.eventId === event.id) ?? null;
  const clashes = plan && profile ? conflictsFor(plan, profile.classBlocks) : [];

  function savePlan(p: EventPlan) {
    if (!profile) return;
    saveProfile({
      ...profile,
      eventPlans: [...profile.eventPlans.filter((x) => x.eventId !== event.id), p],
    });
    setPlanning(false);
  }

  function removePlan() {
    if (!profile) return;
    saveProfile({
      ...profile,
      eventPlans: profile.eventPlans.filter((x) => x.eventId !== event.id),
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised shadow-[var(--shadow-sm)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-fg hover:text-accent"
            >
              {event.name}
              <ExternalLink
                className="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent"
                aria-hidden
              />
            </a>
            {event.organiser !== event.name && (
              <p className="mt-1 text-xs text-fg-subtle">{event.organiser}</p>
            )}
          </div>
          <Badge tone={stage.tone} className="shrink-0">
            {stage.label}
          </Badge>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">{event.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{event.city}</Badge>
          <Badge tone="neutral">{event.cost === "free" ? "Free" : "Ticketed"}</Badge>
          <Badge tone="neutral">{event.cadence}</Badge>
          {event.memberCount && (
            <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle">
              <Users className="size-3" aria-hidden />
              {event.memberCount.toLocaleString("en-AU")}
            </span>
          )}
        </div>

        {/* ------------------------------------------------ going / plan -- */}
        <div className="mt-3.5">
          {plan ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2 text-xs",
                clashes.length
                  ? "border-gap-border border-dashed bg-gap-subtle"
                  : "border-evidence-border bg-evidence-subtle",
              )}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <CalendarCheck className="size-3.5 text-evidence" aria-hidden />
                Going — {formatPlanDate(plan.date)}, {formatHour(plan.start)}
              </span>
              {clashes.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gap">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  Clashes with {clashes[0].label}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <Link href="/planner" className="font-medium text-accent hover:underline">
                  View calendar
                </Link>
                <button
                  onClick={removePlan}
                  aria-label={`Remove ${event.name} from your calendar`}
                  className="rounded p-0.5 text-fg-subtle hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          ) : planning ? (
            <PlanForm eventId={event.id} url={event.url} onSave={savePlan} onCancel={() => setPlanning(false)} />
          ) : (
            <button
              onClick={() => setPlanning(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-bg-raised px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <CalendarPlus className="size-3.5" aria-hidden />
              I&rsquo;m going — add to my calendar
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 border-t border-border px-4 py-2.5 text-left text-xs text-fg-muted hover:bg-bg-subtle"
      >
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        Why this one?
      </button>

      {open && <ScoreAnatomy contributions={contributions} reasons={reasons} />}
    </div>
  );
}

/* Scoring term → segment colour. Labels come verbatim from rankEvents(). */
const TERM_COLOURS: Record<string, string> = {
  "Stage fit": "var(--evidence)",
  "Gap relevance": "var(--gap)",
  "Role topics": "var(--partial)",
  "In Melbourne": "var(--accent)",
  Free: "var(--route-strong)",
  "Community size": "var(--fg-subtle)",
};

/**
 * The score anatomy: a stacked bar of the positive scoring terms, then one row
 * per term pairing its points with the prose reason. Penalties cannot occupy a
 * share of a positive-only bar, so they appear as struck-out notes below it.
 */
function ScoreAnatomy({
  contributions,
  reasons,
}: {
  contributions: RankedEvent["contributions"];
  reasons: string[];
}) {
  // Segments grow from 0 on expansion. CSS transitions are not zeroed by the
  // global reduced-motion rule, so check matchMedia and skip the grow ourselves.
  // Reduced-motion users start fully grown, so there is no width transition
  // to skip. Only rendered client-side (behind a toggle), so reading
  // matchMedia in the initialiser is safe.
  const [grown, setGrown] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const positives = contributions.filter((c) => c.points > 0);
  const totalPositive = positives.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="border-t border-border bg-bg-subtle px-4 py-3">
      {totalPositive > 0 && (
        <div className="flex h-2.5 overflow-hidden rounded-full bg-border" aria-hidden>
          {positives.map((c) => (
            <div
              key={c.label}
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: grown ? `${(c.points / totalPositive) * 100}%` : "0%",
                backgroundColor: TERM_COLOURS[c.label] ?? "var(--fg-subtle)",
              }}
            />
          ))}
        </div>
      )}

      <ul className="mt-2.5 space-y-1.5">
        {contributions.map((c, i) =>
          c.points > 0 ? (
            <li
              key={c.label}
              className="flex items-baseline gap-2 text-xs leading-relaxed text-fg-muted"
            >
              <span
                className="size-2 shrink-0 self-center rounded-full"
                style={{ backgroundColor: TERM_COLOURS[c.label] ?? "var(--fg-subtle)" }}
                aria-hidden
              />
              <span className="shrink-0 font-semibold text-fg">{c.label}</span>
              <span className="min-w-0 flex-1">{reasons[i]}</span>
              <span className="shrink-0 font-mono text-fg">+{c.points}</span>
            </li>
          ) : (
            <li
              key={c.label}
              className="flex items-baseline gap-2 text-xs leading-relaxed text-fg-muted"
            >
              <span className="size-2 shrink-0 self-center rounded-full bg-danger" aria-hidden />
              <span className="shrink-0 font-semibold text-danger">{c.label}</span>
              <span className="min-w-0 flex-1 line-through opacity-70">{reasons[i]}</span>
              <span className="shrink-0 font-mono text-danger">&minus;{Math.abs(c.points)}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/**
 * Most organisers publish the next session only on their own page, so the
 * student confirms it from there. Honest by design: we never invent a
 * schedule we do not have (`docs/technical/data-sources.md` — events are
 * curated, not live).
 */
function PlanForm({
  eventId,
  url,
  onSave,
  onCancel,
}: {
  eventId: string;
  url: string;
  onSave: (p: EventPlan) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [start, setStart] = useState("18:00");
  const [duration, setDuration] = useState(2);

  return (
    <div className="rounded-md border border-border bg-bg-subtle p-3">
      <p className="text-xs text-fg-muted">
        Grab the next session&rsquo;s date from{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
          the organiser&rsquo;s listing
        </a>{" "}
        — we&rsquo;ll check it against your classes.
      </p>
      <div className="mt-2.5 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-fg">
          Date
          <Input
            type="date"
            className="mt-1 h-9 w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-fg">
          Starts
          <Input
            type="time"
            className="mt-1 h-9 w-28"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-fg">
          Hours
          <Input
            type="number"
            min={1}
            max={8}
            className="mt-1 h-9 w-20"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 2)}
          />
        </label>
        <Button
          size="sm"
          onClick={() => {
            const [h, m] = start.split(":").map(Number);
            onSave({ eventId, date, start: h + (m || 0) / 60, durationHours: duration });
          }}
          disabled={!date || !start}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
