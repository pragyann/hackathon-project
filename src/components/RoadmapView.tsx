"use client";

import { BookOpen, Hammer, Rocket, Users } from "lucide-react";

import { Badge } from "@/components/ui";
import type { Roadmap, RoadmapStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_KIND = {
  learn: { icon: BookOpen, label: "Learn" },
  build: { icon: Hammer, label: "Build" },
  ship: { icon: Rocket, label: "Ship" },
  connect: { icon: Users, label: "Connect" },
} as const;

const EFFORT_LABEL = {
  light: "a few hours",
  moderate: "a few weekends",
  substantial: "a semester project",
} as const;

export function RoadmapView({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div>
      <div className="mb-6 rounded-[var(--radius)] border border-accent-border bg-accent-subtle p-4">
        <p className="text-sm font-medium text-fg">{roadmap.headline}</p>
        {/* The stage claim, stated by the product rather than left implicit —
            this is the sentence that proves the plan is paced, not generic. */}
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{roadmap.stageNote}</p>
      </div>

      <ol className="relative space-y-8">
        {roadmap.semesters.map((sem, i) => (
          <li key={sem.label} className="relative pl-8">
            {/* timeline rail */}
            <span
              className="absolute left-[7px] top-2 h-full w-px bg-border last:hidden"
              aria-hidden
            />
            <span
              className={cn(
                "absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-bg",
                i === 0 ? "bg-accent" : "bg-border-strong",
              )}
              aria-hidden
            />

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-sm font-semibold text-fg">{sem.label}</h3>
              <span className="text-xs text-fg-muted">{sem.focus}</span>
              {i === 0 && <Badge tone="accent">Next up</Badge>}
            </div>

            <ul className="mt-3 space-y-2.5">
              {sem.steps.map((step) => (
                <li key={step.id}>
                  <StepCard step={step} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepCard({ step }: { step: RoadmapStep }) {
  const kind = STEP_KIND[step.type];
  const Icon = kind.icon;

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-3.5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
            step.type === "connect"
              ? "bg-evidence-subtle text-evidence"
              : "bg-accent-subtle text-accent",
          )}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{step.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{step.rationale}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{kind.label}</Badge>
            <Badge tone="neutral">{EFFORT_LABEL[step.effort]}</Badge>
            {step.buildsOnUnitCodes.length > 0 && (
              <span className="font-mono text-[11px] text-fg-subtle">
                builds on {step.buildsOnUnitCodes.join(" · ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
