"use client";

import { useState } from "react";

import { Eyebrow } from "@/components/ui";
import type { Role } from "@/lib/types";
import { cn, formatNumber, formatSignedPercent } from "@/lib/utils";

/**
 * The market, drawn from the data this repo actually ships: 60 months of
 * Jobs and Skills Australia IVI counts per role, by-state splits, and
 * year-on-year movement. Interactive, dependency-free SVG.
 */

const ROLE_COLORS = [
  "var(--accent)",
  "var(--route-strong)",
  "var(--partial)",
  "var(--gap)",
  "var(--evidence)",
];

const STATE_ORDER = ["NSW", "VIC", "QLD", "WA", "ACT", "SA", "TAS", "NT"];

/** Month labels for a 60-month series ending at `latestMonth`. */
function monthLabels(latestMonth: string, n: number): string[] {
  const [monthName, yearStr] = latestMonth.split(" ");
  const end = new Date(`${monthName} 1, ${yearStr}`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
  });
}

export function MarketCharts({ roles }: { roles: Role[] }) {
  const withDemand = roles.filter((r) => r.demand);
  const [active, setActive] = useState(withDemand[0]?.id ?? "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const activeRole = withDemand.find((r) => r.id === active) ?? withDemand[0];
  // 60 Date ops per render — cheap enough to skip memoization entirely.
  const labels = monthLabels(activeRole?.demand?.latestMonth ?? "July 2026", 60);

  if (!withDemand.length) return null;

  return (
    <div>
      {/* ------------------------------------------------- role selector -- */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Roles">
        {withDemand.map((r, i) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={active === r.id}
            onClick={() => setActive(r.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              active === r.id
                ? "border-fg bg-fg text-bg"
                : "border-border-strong bg-bg-raised text-fg-muted hover:border-fg-subtle hover:text-fg",
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }}
              aria-hidden
            />
            {r.title}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* -------------------------------------------------- lifelines -- */}
        <figure>
          <figcaption>
            <Eyebrow>One line = one role · 60 months of national job ads</Eyebrow>
          </figcaption>
          <Lifelines
            roles={withDemand}
            activeId={active}
            labels={labels}
            hoverIdx={hoverIdx}
            onHover={setHoverIdx}
            onPick={setActive}
          />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            Every role is below its peak — hover the chart · Source: JSA IVI, July 2026
          </p>
        </figure>

        <div className="space-y-10">
          {/* ------------------------------------------------ by state -- */}
          <figure>
            <figcaption>
              <Eyebrow>
                Where {activeRole.title} ads are · latest month
              </Eyebrow>
            </figcaption>
            <StateBars role={activeRole} />
          </figure>

          {/* ----------------------------------------------------- yoy -- */}
          <figure>
            <figcaption>
              <Eyebrow>Year on year, all roles</Eyebrow>
            </figcaption>
            <DeltaBars roles={withDemand} activeId={active} onPick={setActive} />
          </figure>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ lifelines -- */

function Lifelines({
  roles,
  activeId,
  labels,
  hoverIdx,
  onHover,
  onPick,
}: {
  roles: Role[];
  activeId: string;
  labels: string[];
  hoverIdx: number | null;
  onHover: (i: number | null) => void;
  onPick: (id: string) => void;
}) {
  const W = 640;
  const H = 300;
  const PAD = { l: 44, r: 14, t: 14, b: 26 };

  const max = Math.max(...roles.flatMap((r) => r.demand!.trend));
  const x = (i: number) => PAD.l + (i / 59) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const gridV = [0.25, 0.5, 0.75, 1].map((f) => Math.round((max * f) / 500) * 500);

  return (
    <div className="scroll-x mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="min-w-[560px] w-full"
        role="img"
        aria-label="Sixty months of job-ad counts for five technology roles"
        onMouseLeave={() => onHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 59);
          onHover(i >= 0 && i < 60 ? i : null);
        }}
      >
        {/* grid + axis */}
        {gridV.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--fg-subtle)" fontFamily="var(--font-mono-var)">
              {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : v}
            </text>
          </g>
        ))}
        {[0, 15, 30, 45, 59].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--fg-subtle)" fontFamily="var(--font-mono-var)">
            {labels[i]}
          </text>
        ))}

        {/* lines, inactive first so the active one paints on top */}
        {[...roles]
          .sort((a) => (a.id === activeId ? 1 : -1))
          .map((r) => {
            const i = roles.indexOf(r);
            const isActive = r.id === activeId;
            const d = r.demand!.trend
              .map((v, j) => `${j === 0 ? "M" : "L"}${x(j).toFixed(1)},${y(v).toFixed(1)}`)
              .join(" ");
            return (
              <path
                key={r.id}
                d={d}
                fill="none"
                stroke={ROLE_COLORS[i % ROLE_COLORS.length]}
                strokeWidth={isActive ? 2.6 : 1.4}
                opacity={isActive ? 1 : 0.35}
                strokeLinejoin="round"
                style={{ cursor: "pointer", transition: "opacity .2s" }}
                onClick={() => onPick(r.id)}
              />
            );
          })}

        {/* hover scrubber */}
        {hoverIdx !== null && (
          <g>
            <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.t} y2={H - PAD.b} stroke="var(--fg-subtle)" strokeWidth="1" strokeDasharray="3 3" />
            {roles.map((r, i) => (
              <circle
                key={r.id}
                cx={x(hoverIdx)}
                cy={y(r.demand!.trend[hoverIdx])}
                r={r.id === activeId ? 4 : 2.5}
                fill={ROLE_COLORS[i % ROLE_COLORS.length]}
                stroke="var(--bg-raised)"
                strokeWidth="1.5"
              />
            ))}
            {/* tooltip */}
            <g transform={`translate(${Math.min(x(hoverIdx) + 10, W - 170)}, ${PAD.t + 4})`}>
              <rect width="160" height={16 + roles.length * 14} rx="6" fill="var(--bg-raised)" stroke="var(--border-strong)" />
              <text x="8" y="13" fontSize="9" fontFamily="var(--font-mono-var)" fill="var(--fg-subtle)">
                {labels[hoverIdx]}
              </text>
              {[...roles]
                .sort((a, b) => b.demand!.trend[hoverIdx] - a.demand!.trend[hoverIdx])
                .map((r, row) => (
                  <g key={r.id} transform={`translate(8, ${26 + row * 14})`}>
                    <circle cx="3" cy="-3" r="3" fill={ROLE_COLORS[roles.indexOf(r) % ROLE_COLORS.length]} />
                    <text x="11" y="0" fontSize="9" fill="var(--fg)" fontFamily="var(--font-mono-var)">
                      {formatNumber(r.demand!.trend[hoverIdx]).padStart(6)} {r.title.slice(0, 14)}
                    </text>
                  </g>
                ))}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------- state bars -- */

function StateBars({ role }: { role: Role }) {
  const byState = role.demand!.byState;
  const entries = STATE_ORDER.filter((s) => s in byState).map((s) => [s, byState[s]] as const);
  const max = Math.max(...entries.map(([, v]) => v));

  return (
    <div className="mt-3 space-y-1.5">
      {entries.map(([state, v]) => (
        <div key={state} className="flex items-center gap-2">
          <span className="w-9 font-mono text-[11px] font-semibold text-fg-muted">{state}</span>
          <div className="h-4 flex-1 rounded-sm bg-bg-subtle">
            <div
              className={cn("h-full rounded-sm transition-all duration-500", state === "VIC" ? "bg-route-strong" : "bg-fg/25")}
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono text-[11px] text-fg-muted">{formatNumber(v)}</span>
        </div>
      ))}
      <p className="pt-1 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        VIC highlighted — where your events are
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- yoy bars -- */

function DeltaBars({
  roles,
  activeId,
  onPick,
}: {
  roles: Role[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const maxAbs = Math.max(...roles.map((r) => Math.abs(r.demand!.yearOnYearPct ?? 0)));

  return (
    <div className="mt-3 space-y-1.5">
      {roles.map((r, i) => {
        const v = r.demand!.yearOnYearPct ?? 0;
        return (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left transition-colors",
              r.id === activeId ? "bg-bg-subtle" : "hover:bg-bg-subtle/60",
            )}
          >
            <span className="w-28 truncate text-[11px] font-semibold text-fg-muted">{r.title}</span>
            <div className="relative h-4 flex-1">
              <div className="absolute inset-y-0 right-0 w-px bg-border-strong" aria-hidden />
              <div
                className="absolute inset-y-0 right-0 rounded-l-sm"
                style={{
                  width: `${(Math.abs(v) / maxAbs) * 100}%`,
                  background: ROLE_COLORS[i % ROLE_COLORS.length],
                  opacity: r.id === activeId ? 1 : 0.45,
                }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[11px] font-semibold text-gap">
              {formatSignedPercent(v)}
            </span>
          </button>
        );
      })}
      <p className="pt-1 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        A tightening market is the case for a map, not against one
      </p>
    </div>
  );
}
