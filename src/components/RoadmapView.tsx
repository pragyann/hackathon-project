"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Hammer, Rocket, Users } from "lucide-react";

import { StudyDrawer, type StudyContext } from "@/components/StudyDrawer";
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

/**
 * The roadmap drawn as the route it is: a gold line with an exit per semester.
 * The same visual grammar as the landing hero, now carrying the student's own
 * plan.
 */
export function RoadmapView({
  roadmap,
  studyContextFor,
}: {
  roadmap: Roadmap;
  /** Supplied by the plan page, which knows the role and the units. */
  studyContextFor?: (step: RoadmapStep) => StudyContext;
}) {
  const [study, setStudy] = useState<StudyContext | null>(null);

  return (
    <div>
      <div className="mb-7 rounded-[var(--radius)] border border-route-strong/30 bg-route-subtle p-4">
        <p className="text-sm font-bold text-fg">{roadmap.headline}</p>
        {/* The stage claim, stated by the product rather than left implicit —
            this is the sentence that proves the plan is paced, not generic. */}
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{roadmap.stageNote}</p>
      </div>

      <ol className="relative ml-1.5 border-l-[3px] border-route-strong/70 pb-2">
        {roadmap.semesters.map((sem, i) => (
          <li key={sem.label} className="relative pb-9 pl-8 last:pb-0">
            {/* the exit marker */}
            <span
              className={cn(
                "absolute -left-[15px] top-0 flex size-[27px] items-center justify-center rounded-[6px] border-2 font-mono text-xs font-bold",
                i === 0
                  ? "border-route-fg/60 bg-route text-route-fg"
                  : "border-border-strong bg-bg-raised text-fg-muted",
              )}
              aria-hidden
            >
              {i + 1}
            </span>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-fg">
                {sem.label}
              </h3>
              <span className="text-xs text-fg-muted">{sem.focus}</span>
              {i === 0 && <Badge tone="route">Next up</Badge>}
            </div>

            <ul className="mt-3 space-y-2.5">
              {sem.steps.map((step) => (
                <li key={step.id}>
                  <StepCard
                    step={step}
                    onStudy={
                      studyContextFor ? () => setStudy(studyContextFor(step)) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {study && <StudyDrawer context={study} onClose={() => setStudy(null)} />}
    </div>
  );
}

function StepCard({ step, onStudy }: { step: RoadmapStep; onStudy?: () => void }) {
  const kind = STEP_KIND[step.type];
  const Icon = kind.icon;

  return (
    <div className="rounded-md border border-border bg-bg-raised p-3.5 shadow-[var(--shadow-sm)]">
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
          <p className="text-sm font-semibold text-fg">{step.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{step.rationale}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{kind.label}</Badge>
            <Badge tone="neutral">{EFFORT_LABEL[step.effort]}</Badge>
            {step.buildsOnUnitCodes.length > 0 && (
              <span className="font-mono text-[11px] font-medium text-fg-subtle">
                builds on {step.buildsOnUnitCodes.join(" · ")}
              </span>
            )}
            {onStudy && (
              <button
                onClick={onStudy}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-accent-border bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-fg"
              >
                <GraduationCap className="size-3" aria-hidden />
                Study this
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
