"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Badge, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Capability, CapabilityStatus } from "@/lib/types";

/*
  GapTerrain — the capability picture as a survey map rather than a kanban.

  x = evidence strength (gap → partial → evidenced), y = importance
  (core → nice-to-have), so the top-left corner is always "the delta that
  matters most" and the bottom-right is "already yours". Marker jitter is
  hashed from the capability id so the terrain never reshuffles on re-render.
*/

const W = 900;
const H = 560;

// Plot area inside the axis labels.
const PLOT = { x0: 92, x1: 858, y0: 78, y1: 474 };

const STATUS_ORDER: CapabilityStatus[] = ["gap", "partial", "evidenced"];
const IMPORTANCE_ORDER = ["core", "common", "nice-to-have"] as const;

const STATUS_VAR: Record<CapabilityStatus, string> = {
  evidenced: "var(--evidence)",
  partial: "var(--partial)",
  gap: "var(--gap)",
};

const STATUS_TONE = {
  evidenced: "evidence",
  partial: "partial",
  gap: "gap",
} as const;

const STATUS_LABEL: Record<CapabilityStatus, string> = {
  evidenced: "Evidenced",
  partial: "Partial",
  gap: "Gap",
};

/** FNV-1a — cheap, stable hash so jitter survives re-renders and reloads. */
function hash(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type Marker = {
  cap: Capability;
  cx: number;
  cy: number;
  r: number;
};

function layoutMarkers(capabilities: Capability[]): Marker[] {
  const bandW = (PLOT.x1 - PLOT.x0) / 3;
  const bandH = (PLOT.y1 - PLOT.y0) / 3;
  return capabilities.map((cap) => {
    const col = STATUS_ORDER.indexOf(cap.status);
    const row = IMPORTANCE_ORDER.indexOf(cap.importance);
    const h = hash(cap.id);
    // Two independent unit jitters from one hash; padded so markers stay in-band.
    const u = ((h & 0xffff) / 0xffff) * 0.84 + 0.08;
    const v = (((h >>> 16) & 0xffff) / 0xffff) * 0.78 + 0.11;
    const r = cap.importance === "core" ? 13 : cap.importance === "common" ? 11 : 9;
    return {
      cap,
      cx: PLOT.x0 + bandW * col + u * bandW,
      cy: PLOT.y0 + bandH * row + v * bandH,
      r,
    };
  });
}

/* ------------------------------------------------------------- component -- */

export function GapTerrain({
  capabilities,
  highlightedIds,
  onHoverCapability,
}: {
  capabilities: Capability[];
  /** When non-empty, matching markers glow and the rest dim. */
  highlightedIds?: string[];
  /** Hovered capability id (or []) so siblings can cross-highlight. */
  onHoverCapability?: (ids: string[]) => void;
}) {
  const markers = useMemo(() => layoutMarkers(capabilities), [capabilities]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);

  // rAF-free parallax still needs the reduced-motion check done by hand.
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const open = openId ? capabilities.find((c) => c.id === openId) ?? null : null;

  // Esc closes the drawer, the way it opened stays reachable.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const setHover = useCallback(
    (id: string | null) => {
      setHoveredId(id);
      onHoverCapability?.(id ? [id] : []);
    },
    [onHoverCapability],
  );

  function onPointerMove(e: React.PointerEvent) {
    if (reducedMotion.current || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setParallax({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  }

  const highlighting = (highlightedIds?.length ?? 0) > 0;
  const hovered = hoveredId ? markers.find((m) => m.cap.id === hoveredId) : null;

  return (
    <div
      ref={panelRef}
      className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-bg-raised"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      {/* Component-scoped keyframes: entry pop for markers. */}
      <style>{`
        @keyframes gt-pop {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        .gt-pop {
          transform-box: fill-box;
          transform-origin: center;
          animation: gt-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Capability terrain map: evidence strength across, importance down"
      >
        <defs>
          {/* Soft halo behind each marker. */}
          <filter id="gt-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Grid + contours: shallow parallax, opposite direction to markers. */}
        <g
          style={{
            transform: `translate(${parallax.x * 6}px, ${parallax.y * 6}px)`,
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Fine survey grid. */}
          {Array.from({ length: 18 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={PLOT.x0 + ((PLOT.x1 - PLOT.x0) / 17) * i}
              y1={PLOT.y0}
              x2={PLOT.x0 + ((PLOT.x1 - PLOT.x0) / 17) * i}
              y2={PLOT.y1}
              stroke="var(--border)"
              strokeWidth={i % 6 === 0 ? 1.1 : 0.5}
            />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={PLOT.x0}
              y1={PLOT.y0 + ((PLOT.y1 - PLOT.y0) / 11) * i}
              x2={PLOT.x1}
              y2={PLOT.y0 + ((PLOT.y1 - PLOT.y0) / 11) * i}
              stroke="var(--border)"
              strokeWidth={i % 5 === 0 ? 1.1 : 0.5}
            />
          ))}

          {/* Contour ellipses radiating from the "close these first" corner. */}
          {[210, 380, 560].map((rx, i) => (
            <ellipse
              key={rx}
              cx={PLOT.x0}
              cy={PLOT.y0}
              rx={rx}
              ry={rx * 0.62}
              fill="none"
              stroke="var(--gap)"
              strokeWidth={1}
              opacity={0.16 - i * 0.045}
            />
          ))}

          {/* Corner annotations: the map's own reading instructions. */}
          <text
            x={PLOT.x0 + 6}
            y={PLOT.y0 + 22}
            fill="var(--gap)"
            className="font-mono"
            fontSize={11}
            fontWeight={600}
            letterSpacing="0.14em"
          >
            CLOSE THESE FIRST
          </text>
          <text
            x={PLOT.x1 - 6}
            y={PLOT.y1 - 12}
            fill="var(--evidence)"
            textAnchor="end"
            className="font-mono"
            fontSize={11}
            fontWeight={600}
            letterSpacing="0.14em"
          >
            ALREADY YOURS
          </text>
        </g>

        {/* Static axis labels — the frame does not drift with the terrain. */}
        <g className="font-mono" fontSize={10.5} fontWeight={600} fill="var(--fg-subtle)" letterSpacing="0.14em">
          {/* x axis: evidence strength. */}
          <text x={PLOT.x0} y={H - 34}>GAP</text>
          <text x={(PLOT.x0 + PLOT.x1) / 2} y={H - 34} textAnchor="middle">PARTIAL</text>
          <text x={PLOT.x1} y={H - 34} textAnchor="end">EVIDENCED</text>
          <text x={(PLOT.x0 + PLOT.x1) / 2} y={H - 12} textAnchor="middle" fill="var(--fg-subtle)" opacity={0.75}>
            EVIDENCE STRENGTH →
          </text>
          {/* y axis: importance. */}
          <text x={16} y={PLOT.y0 + 12}>CORE</text>
          <text x={16} y={(PLOT.y0 + PLOT.y1) / 2 + 4}>COMMON</text>
          <text x={16} y={PLOT.y1 - 2}>NICE-TO</text>
        </g>

        {/* Markers: deeper parallax, opposite direction to the grid. */}
        <g
          style={{
            transform: `translate(${parallax.x * -10}px, ${parallax.y * -10}px)`,
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {markers.map((m, i) => {
            const { cap, cx, cy, r } = m;
            const colour = STATUS_VAR[cap.status];
            const isHighlighted = highlighting && (highlightedIds ?? []).includes(cap.id);
            const dimmed = highlighting && !isHighlighted;
            const isHovered = hoveredId === cap.id;
            const scale = isHovered ? 1.28 : 1;
            return (
              <g key={cap.id} transform={`translate(${cx} ${cy})`}>
                <g
                  className="gt-pop"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${cap.name} — ${STATUS_LABEL[cap.status]}, ${cap.importance}. Press Enter for detail.`}
                    style={{
                      cursor: "pointer",
                      opacity: dimmed ? 0.35 : 1,
                      transition: "opacity 0.3s ease",
                      outlineOffset: 4,
                    }}
                    onPointerEnter={() => setHover(cap.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(cap.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => setOpenId(cap.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenId(cap.id);
                      }
                    }}
                  >
                    {/* Soft glow, boosted when this marker is cross-highlighted. */}
                    <circle
                      r={r * 2.1}
                      fill={colour}
                      opacity={isHighlighted || isHovered ? 0.4 : 0.16}
                      filter="url(#gt-glow)"
                      style={{ transition: "opacity 0.3s ease" }}
                    />
                    {isHighlighted && (
                      <circle
                        r={r + 7}
                        fill="none"
                        stroke={colour}
                        strokeWidth={1.5}
                        opacity={0.7}
                        style={{ animation: "pulse-soft 1.8s ease-in-out infinite" }}
                      />
                    )}
                    <g
                      style={{
                        transform: `scale(${scale})`,
                        transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      <circle r={r} fill={colour} opacity={0.92} />
                      {/* Roadworks ring: gaps read as dashed even without a legend. */}
                      {cap.status === "gap" && (
                        <circle
                          r={r + 4}
                          fill="none"
                          stroke={colour}
                          strokeWidth={1.5}
                          strokeDasharray="4 3.5"
                        />
                      )}
                      <circle r={r} fill="none" stroke="var(--bg-raised)" strokeWidth={1.5} opacity={0.9} />
                    </g>
                    {/* Grounding badge: the first unit that evidences this. */}
                    {cap.status !== "gap" && cap.evidence[0] && (
                      <text
                        y={r + 16}
                        textAnchor="middle"
                        className="font-mono"
                        fontSize={9.5}
                        fontWeight={600}
                        fill="var(--fg-subtle)"
                      >
                        {cap.evidence[0].unitCode}
                      </text>
                    )}
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip: HTML so text wraps properly; flips side near the right edge. */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 w-60 rounded-md border border-border bg-bg-raised p-3 shadow-[var(--shadow)]"
          style={{
            left: `${(hovered.cx / W) * 100}%`,
            top: `${(hovered.cy / H) * 100}%`,
            transform: hovered.cx > W * 0.62
              ? "translate(calc(-100% - 18px), -50%)"
              : "translate(18px, -50%)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-snug text-fg">{hovered.cap.name}</p>
            <Badge tone={STATUS_TONE[hovered.cap.status]}>{STATUS_LABEL[hovered.cap.status]}</Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-muted">
            {hovered.cap.rationale}
          </p>
        </div>
      )}

      {/* Legend: road-surface swatches in the three semantic colours. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-bg-subtle px-4 py-2.5">
        {(
          [
            { status: "evidenced" as const, dash: undefined, label: "sealed — evidenced" },
            { status: "partial" as const, dash: "14 8", label: "half-sealed — partial" },
            { status: "gap" as const, dash: "5 6", label: "roadworks — gap" },
          ]
        ).map(({ status, dash, label }) => (
          <span key={status} className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            <svg width="36" height="6" viewBox="0 0 36 6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="36"
                y2="3"
                stroke={STATUS_VAR[status]}
                strokeWidth="3"
                strokeDasharray={dash}
              />
            </svg>
            {label}
          </span>
        ))}
      </div>

      {/* Detail drawer, StudyDrawer-style: fixed right, Esc or x to close. */}
      {open && (
        <div
          role="dialog"
          aria-label={`Capability detail: ${open.name}`}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-raised shadow-[var(--shadow-lg)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-3.5">
            <div className="min-w-0">
              <Eyebrow>Capability</Eyebrow>
              <h2 className="mt-1 text-sm font-bold text-fg">{open.name}</h2>
            </div>
            <button
              onClick={() => setOpenId(null)}
              aria-label="Close capability detail"
              className="rounded p-1 text-fg-subtle hover:bg-bg hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[open.status]}>{STATUS_LABEL[open.status]}</Badge>
              <Badge>{open.importance}</Badge>
              <Badge>{open.category}</Badge>
            </div>

            <p className="text-sm leading-relaxed text-fg-muted">{open.rationale}</p>

            {open.evidence.length > 0 ? (
              <div>
                <Eyebrow className="mb-2">Traced to your units</Eyebrow>
                <ul className="space-y-3">
                  {open.evidence.map((ev, i) => (
                    <li key={`${ev.unitCode}-${i}`} className="rounded-md border border-border bg-bg-subtle p-3">
                      <p className="font-mono text-xs font-semibold text-fg">
                        {ev.unitCode}
                        <span className="ml-2 font-sans font-normal text-fg-subtle">{ev.unitTitle}</span>
                      </p>
                      <p className={cn("handbook-quote mt-1.5 text-sm leading-relaxed text-fg-muted")}>
                        “{ev.quote}”
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-xs leading-relaxed text-fg-subtle">
                No unit evidence yet — this is exactly what the roadmap steps exist to close.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
