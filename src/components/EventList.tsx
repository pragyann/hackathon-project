"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Users } from "lucide-react";

import { Badge } from "@/components/ui";
import type { RankedEvent } from "@/lib/data";
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
  const { event, reasons, stageFit } = ranked;
  const stage = STAGE_COPY[stageFit];

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

      {open && (
        <ul className="space-y-1.5 border-t border-border bg-bg-subtle px-4 py-3">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-fg-muted">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
