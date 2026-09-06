"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BookOpen, GraduationCap, Hammer, Rocket, Users } from "lucide-react";

import { StudyDrawer, type StudyContext } from "@/components/StudyDrawer";
import { Badge } from "@/components/ui";
import { goldBurst } from "@/lib/confetti";
import { saveProfile, useStoredProfile } from "@/lib/store";
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
 * The roadmap as a journey rather than a list: each semester is a station
 * that reveals as you scroll, its stretch of gold route filling in behind it.
 * Same data, same tick-off store as RoadmapView — the scroll is the point.
 */
export function RoadmapJourney({
  roadmap,
  studyContextFor,
  highlightedCapabilityIds,
  onHoverStep,
}: {
  roadmap: Roadmap;
  /** Supplied by the plan page, which knows the role and the units. */
  studyContextFor?: (step: RoadmapStep) => StudyContext;
  /** When non-empty, steps not addressing any of these dim back. */
  highlightedCapabilityIds?: string[];
  /** Hovered step's capability ids, [] on leave — lets a sibling view glow. */
  onHoverStep?: (capabilityIds: string[]) => void;
}) {
  const [study, setStudy] = useState<StudyContext | null>(null);
  const profile = useStoredProfile();
  const done = new Set(profile?.completedStepIds ?? []);

  function toggleStep(id: string, e: MouseEvent) {
    if (!profile) return;
    const wasDone = done.has(id);
    saveProfile({
      ...profile,
      completedStepIds: wasDone
        ? profile.completedStepIds.filter((x) => x !== id)
        : [...profile.completedStepIds, id],
    });
    // Celebrate finishing, never un-finishing.
    if (!wasDone) goldBurst(e.clientX, e.clientY);
  }

  const total = roadmap.semesters.reduce((n, s) => n + s.steps.length, 0);
  const doneCount = roadmap.semesters.reduce(
    (n, s) => n + s.steps.filter((st) => done.has(st.id)).length,
    0,
  );

  // First unfinished step in document order carries the "you are here" marker;
  // its semester is the current one and wears the gold exit shield.
  const hereStepId = useMemo(() => {
    for (const sem of roadmap.semesters)
      for (const step of sem.steps) if (!done.has(step.id)) return step.id;
    return null;
    // done is derived from the profile, which is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, profile]);
  const currentSemIndex = Math.max(
    0,
    roadmap.semesters.findIndex((s) => s.steps.some((st) => st.id === hereStepId)),
  );

  const highlight = highlightedCapabilityIds ?? [];

  return (
    <div>
      <div className="mb-7 rounded-[var(--radius)] border border-route-strong/30 bg-route-subtle p-4">
        <p className="text-sm font-bold text-fg">{roadmap.headline}</p>
        {/* The stage claim, stated by the product rather than left implicit. */}
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{roadmap.stageNote}</p>
        {total > 0 && (
          <p className="mt-2.5 font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
            {doneCount}/{total} steps done — ticking them is what the semester loop
            comes back to
          </p>
        )}
      </div>

      <ol className="relative ml-1.5 pb-2">
        {roadmap.semesters.map((sem, i) => (
          <Station key={sem.label} isCurrent={i === currentSemIndex}>
            {/* the exit marker */}
            <span
              className={cn(
                "absolute -left-[12px] top-0 flex size-[27px] items-center justify-center rounded-[6px] border-2 font-mono text-xs font-bold",
                i === currentSemIndex
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
              {i === currentSemIndex && <Badge tone="route">Next up</Badge>}
            </div>

            <ul className="mt-3 space-y-2.5">
              {sem.steps.map((step, j) => {
                const dimmed =
                  highlight.length > 0 &&
                  !step.addressesCapabilityIds.some((id) => highlight.includes(id));
                return (
                  <li key={step.id}>
                    {step.id === hereStepId && <YouAreHere />}
                    <div
                      onMouseEnter={() => onHoverStep?.(step.addressesCapabilityIds)}
                      onMouseLeave={() => onHoverStep?.([])}
                      // Even cards drift in from the left, odd from the right —
                      // a journey should weave a little. The station wrapper
                      // (.journey-in) releases the transform once visible.
                      style={{ transitionDelay: `${Math.min(j, 6) * 70}ms` }}
                      className={cn(
                        "journey-step transition-[opacity,transform] duration-700",
                        j % 2 === 0 ? "journey-step-l" : "journey-step-r",
                        dimmed && "opacity-40",
                      )}
                    >
                      <StepCard
                        step={step}
                        done={done.has(step.id)}
                        onToggle={(e) => toggleStep(step.id, e)}
                        onStudy={
                          studyContextFor ? () => setStudy(studyContextFor(step)) : undefined
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Station>
        ))}
      </ol>

      {/* Scoped styles for the reveal choreography — plain CSS so the global
          prefers-reduced-motion kill-switch (zeroed durations) applies. */}
      <style>{`
        .journey-station .journey-body { opacity: 0; transform: translateY(18px); }
        .journey-station .journey-step-l { transform: translateX(-14px); }
        .journey-station .journey-step-r { transform: translateX(14px); }
        .journey-station.journey-in .journey-body { opacity: 1; transform: none; }
        .journey-station.journey-in .journey-step-l,
        .journey-station.journey-in .journey-step-r { transform: none; }
        .journey-station .journey-rail { background: transparent; }
        .journey-station.journey-in .journey-rail { background: var(--color-route-strong, #b8860b); opacity: 0.7; }
        @media (prefers-reduced-motion: reduce) {
          .journey-station .journey-body,
          .journey-station .journey-step-l,
          .journey-station .journey-step-r { opacity: 1; transform: none; }
        }
      `}</style>

      {study && <StudyDrawer context={study} onClose={() => setStudy(null)} />}
    </div>
  );
}

/**
 * One semester on the rail. Watches its own visibility: at 25% on screen it
 * fades the station in and pours gold into its stretch of the route.
 */
function Station({
  isCurrent,
  children,
}: {
  isCurrent: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("journey-in");
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li ref={ref} className="journey-station relative pb-9 pl-8 last:pb-0" data-current={isCurrent || undefined}>
      {/* this station's rail segment — transparent until scrolled to */}
      <span
        aria-hidden
        className="journey-rail absolute left-0 top-0 h-full w-[3px] rounded-full transition-[background,opacity] duration-1000"
      />
      <div className="journey-body transition-[opacity,transform] duration-700">{children}</div>
    </li>
  );
}

/** The pulsing gold dot marking the first step not yet ticked off. */
function YouAreHere() {
  return (
    <div className="mb-1.5 flex items-center gap-2" aria-label="You are here">
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-route-strong [animation:pulse-soft_1.8s_ease-in-out_infinite]" />
        <span className="relative inline-flex size-2.5 rounded-full border border-route-fg/40 bg-route" />
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-muted">
        You are here
      </span>
    </div>
  );
}

function StepCard({
  step,
  done,
  onToggle,
  onStudy,
}: {
  step: RoadmapStep;
  done: boolean;
  onToggle: (e: MouseEvent) => void;
  onStudy?: () => void;
}) {
  const kind = STEP_KIND[step.type];
  const Icon = kind.icon;

  return (
    <div
      className={cn(
        "rounded-md border bg-bg-raised p-3.5 shadow-[var(--shadow-sm)] transition-colors",
        done ? "border-evidence-border bg-evidence-subtle/50" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${step.title}" ${done ? "not done" : "done"}`}
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
            done
              ? "border-evidence bg-evidence text-white"
              : step.type === "connect"
                ? "border-transparent bg-evidence-subtle text-evidence hover:border-evidence"
                : "border-transparent bg-accent-subtle text-accent hover:border-accent",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold text-fg", done && "line-through opacity-60")}>
            {step.title}
          </p>
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
