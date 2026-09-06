"use client";

/**
 * KpiStrip — four animated KPI tiles for the plan page.
 * Readiness (weighted), core coverage, the cheapest win (a named
 * recommendation, not a number), and grounding honesty.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Capability, Roadmap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui";

/* ------------------------------------------------------------- helpers -- */

const IMPORTANCE_WEIGHT: Record<Capability["importance"], number> = {
  core: 3,
  common: 2,
  "nice-to-have": 1,
};

const STATUS_VALUE: Record<Capability["status"], number> = {
  evidenced: 1,
  partial: 0.5,
  gap: 0,
};

/** Higher = more important, for picking the cheapest win. */
const IMPORTANCE_RANK: Record<Capability["importance"], number> = {
  core: 2,
  common: 1,
  "nice-to-have": 0,
};

/* ------------------------------------------------------------ count-up -- */

/**
 * Animate 0 → value over ~900ms with an ease-out curve. Reduced-motion
 * users get the final number immediately — no rAF loop at all.
 */
function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    // Respect the OS preference: land on the value in a single frame instead
    // of easing (setState stays inside the rAF callback, not the effect body).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const tick = (now: number) => {
      if (reduced) {
        setDisplay(value);
        return;
      }
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, durationMs]);

  return display;
}

/* ----------------------------------------------------------- arc gauge -- */

/** Small 3/4-circle gauge: bg-subtle track, accent progress stroke. */
function ArcGauge({ pct }: { pct: number }) {
  const size = 44;
  const r = 17;
  const c = 2 * Math.PI * r;
  const sweep = 0.75; // 270° arc leaves a gap at the bottom
  const track = c * sweep;
  const fill = track * Math.min(Math.max(pct, 0), 100) / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      // rotate so the gap sits at the bottom, symmetric
      className="shrink-0 -rotate-[225deg]"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--bg-subtle)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${track} ${c}`}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${c}`}
        // let CSS transition follow the count-up without its own rAF
        style={{ transition: "stroke-dasharray 120ms linear" }}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------- tile -- */

function Tile({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-raised p-4 flex flex-col gap-2 min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex-1 min-w-0">{children}</div>
      <p className="text-xs text-fg-muted leading-snug">{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------- KpiStrip -- */

export function KpiStrip({
  capabilities,
  droppedUngrounded,
  roadmap,
  completedStepIds,
}: {
  capabilities: Capability[];
  droppedUngrounded: number;
  roadmap: Roadmap | null;
  completedStepIds: string[];
}) {
  /* -- derived numbers, memoised so the count-up target is stable -- */

  const { readiness, coreCoverage, cheapestWin, stepsDone, stepsTotal } =
    useMemo(() => {
      // Weighted readiness: importance-weighted mean of status values.
      let weightSum = 0;
      let valueSum = 0;
      for (const cap of capabilities) {
        const w = IMPORTANCE_WEIGHT[cap.importance];
        weightSum += w;
        valueSum += w * STATUS_VALUE[cap.status];
      }
      const readiness = weightSum ? Math.round((valueSum / weightSum) * 100) : 0;

      // Core coverage: core capabilities at least partially evidenced.
      const cores = capabilities.filter((c) => c.importance === "core");
      const covered = cores.filter((c) => c.status !== "gap").length;
      const coreCoverage = cores.length
        ? Math.round((covered / cores.length) * 100)
        : 0;

      // Cheapest win: highest-importance non-evidenced capability that a
      // "light" roadmap step addresses; fall back to any non-evidenced core.
      const lightTargets = new Set<string>();
      const allSteps = roadmap?.semesters.flatMap((s) => s.steps) ?? [];
      for (const step of allSteps) {
        if (step.effort === "light") {
          for (const id of step.addressesCapabilityIds) lightTargets.add(id);
        }
      }
      const notEvidenced = capabilities.filter((c) => c.status !== "evidenced");
      const byImportance = [...notEvidenced].sort(
        (a, b) => IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance],
      );
      const cheapestWin =
        byImportance.find((c) => lightTargets.has(c.id)) ??
        byImportance.find((c) => c.importance === "core") ??
        null;

      // Steps done: only count ticked ids that exist in this roadmap.
      const stepIds = new Set(allSteps.map((s) => s.id));
      const stepsDone = completedStepIds.filter((id) => stepIds.has(id)).length;

      return {
        readiness,
        coreCoverage,
        cheapestWin,
        stepsDone,
        stepsTotal: allSteps.length,
      };
    }, [capabilities, roadmap, completedStepIds]);

  const readinessNow = useCountUp(readiness);
  const coverageNow = useCountUp(coreCoverage);
  const grounded = droppedUngrounded === 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-[var(--radius)] border border-border overflow-hidden">
      {/* KPI 1 — weighted readiness with an arc gauge */}
      <Tile label="Readiness" sub="Weighted by how much each capability matters">
        <div className="flex items-center gap-3">
          <ArcGauge pct={readinessNow} />
          <span className="font-mono text-3xl font-bold text-fg tabular-nums">
            {Math.round(readinessNow)}
            <span className="text-lg text-fg-muted">%</span>
          </span>
        </div>
      </Tile>

      {/* KPI 2 — core coverage with a thin progress bar */}
      <Tile label="Core coverage" sub="Core capabilities evidenced or in progress">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-3xl font-bold text-fg tabular-nums">
            {Math.round(coverageNow)}
            <span className="text-lg text-fg-muted">%</span>
          </span>
          <div className="h-1 rounded-full bg-bg-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${coverageNow}%`, transition: "width 120ms linear" }}
            />
          </div>
        </div>
      </Tile>

      {/* KPI 3 — the cheapest win: a name, deliberately not a number */}
      <Tile
        label="Cheapest win"
        sub={
          cheapestWin
            ? "highest value · lightest lift"
            : "Every capability is already evidenced"
        }
      >
        <p className="font-semibold text-fg leading-snug truncate" title={cheapestWin?.name}>
          {cheapestWin ? cheapestWin.name : "Nothing outstanding"}
        </p>
      </Tile>

      {/* KPI 4 — grounding honesty, plus roadmap progress when present */}
      <Tile label="Grounding" sub="every citation checked in code">
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "font-semibold leading-snug",
              grounded ? "text-evidence" : "text-gap",
            )}
          >
            {grounded
              ? "0 ungrounded claims"
              : `${droppedUngrounded} claim${droppedUngrounded === 1 ? "" : "s"} dropped`}
          </p>
          {roadmap && (
            <p className="text-xs text-fg-muted font-mono tabular-nums">
              {stepsDone}/{stepsTotal} steps done
            </p>
          )}
        </div>
      </Tile>
    </div>
  );
}
