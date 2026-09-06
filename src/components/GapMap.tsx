"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui";
import type { Capability, CapabilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Road-condition language: each column header carries its own road surface, so
   the three states read at a glance and without colour (solid / half / dashed). */
const COLUMNS: {
  status: CapabilityStatus;
  title: string;
  blurb: string;
  color: string;
  dash?: string;
  cardBorder: string;
}[] = [
  {
    status: "evidenced",
    title: "Evidenced",
    blurb: "Your coursework demonstrates this",
    color: "var(--evidence)",
    cardBorder: "border-evidence-border",
  },
  {
    status: "partial",
    title: "Partial",
    blurb: "Touched on, not demonstrated",
    color: "var(--partial)",
    dash: "22 7",
    cardBorder: "border-partial-border",
  },
  {
    status: "gap",
    title: "Gap",
    blurb: "What the roadmap is for",
    color: "var(--gap)",
    dash: "7 7",
    cardBorder: "border-gap-border border-dashed",
  },
];

export function GapMap({ capabilities }: { capabilities: Capability[] }) {
  const counts = {
    evidenced: capabilities.filter((c) => c.status === "evidenced").length,
    partial: capabilities.filter((c) => c.status === "partial").length,
    gap: capabilities.filter((c) => c.status === "gap").length,
  };
  const total = capabilities.length || 1;

  return (
    <div>
      {/* One bar, so the shape of the answer is legible before any reading. */}
      <div
        className="mb-7 flex h-2.5 overflow-hidden rounded-full bg-bg-subtle"
        role="img"
        aria-label={`${counts.evidenced} evidenced, ${counts.partial} partial, ${counts.gap} gaps`}
      >
        {(["evidenced", "partial", "gap"] as const).map((s) => (
          <div
            key={s}
            className={cn(
              "transition-all duration-700",
              s === "evidenced" && "bg-evidence",
              s === "partial" && "bg-partial",
              s === "gap" && "bg-gap",
            )}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = capabilities.filter((c) => c.status === col.status);
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`}>
              <div className="flex items-baseline gap-2.5">
                <h3
                  id={`col-${col.status}`}
                  className="text-sm font-extrabold uppercase tracking-wide text-fg"
                >
                  {col.title}
                </h3>
                <span className="font-mono text-sm font-semibold text-fg-subtle">
                  {items.length}
                </span>
              </div>
              <svg width="100%" height="6" aria-hidden className="mt-1.5">
                <line
                  x1="2"
                  y1="3"
                  x2="98%"
                  y2="3"
                  stroke={col.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={col.dash}
                />
              </svg>
              <p className="mb-3 mt-1.5 text-xs text-fg-subtle">{col.blurb}</p>

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-xs text-fg-subtle">
                  Nothing in this column.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((c) => (
                    <li key={c.id}>
                      <CapabilityCard capability={c} border={col.cardBorder} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CapabilityCard({
  capability: c,
  border,
}: {
  capability: Capability;
  border: string;
}) {
  const [open, setOpen] = useState(false);
  const hasWhy = c.evidence.length > 0 || Boolean(c.rationale);

  return (
    <div className={cn("rounded-md border bg-bg-raised", border)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!hasWhy}
        className="flex w-full items-start justify-between gap-3 p-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-fg">{c.name}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {c.importance === "core" && <Badge tone="accent">Core</Badge>}
            <Badge tone="neutral">{c.category}</Badge>
            {c.evidence.length > 0 && (
              <span className="font-mono text-[11px] font-medium text-fg-subtle">
                {c.evidence.map((e) => e.unitCode).join(" · ")}
              </span>
            )}
          </span>
        </span>
        {hasWhy && (
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-fg-subtle transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        )}
      </button>

      {/* P0-7. Every recommendation exposes its "why" in one click, and the why
          is a quote from the university's own description, not a paraphrase. */}
      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2.5">
          <p className="text-xs leading-relaxed text-fg-muted">{c.rationale}</p>
          {c.evidence.length > 0 && (
            <ul className="mt-3 space-y-2">
              {c.evidence.map((e, i) => (
                <li key={i} className="rounded-md bg-bg-subtle p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-fg">
                      {e.unitCode}
                    </span>
                    <span className="truncate text-[11px] text-fg-muted">
                      {e.unitTitle}
                    </span>
                  </div>
                  {/* The university's words, in the university's voice. */}
                  <p className="handbook-quote mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                    &ldquo;{e.quote}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
