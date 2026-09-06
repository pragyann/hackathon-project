import type { CSSProperties } from "react";

/**
 * The signature element: a route drawn from "you are here" (the units a
 * student has completed) to a signage-green destination panel (the role and
 * its real Australian demand). It is the product's whole argument as one
 * picture, and it draws itself once on load.
 */
export function RouteHero({
  roleTitle,
  ads,
  month,
  unitCodes,
}: {
  roleTitle: string;
  ads: string;
  month: string;
  unitCodes: string[];
}) {
  // Hand-placed waypoints along the path below. If the path changes, move these.
  const waypoints = [
    { x: 150, y: 330, code: unitCodes[0] ?? "COMP10001" },
    { x: 300, y: 252, code: unitCodes[1] ?? "COMP20003" },
  ];

  return (
    <svg
      viewBox="0 0 560 420"
      className="h-auto w-full max-w-[560px]"
      role="img"
      aria-label={`A route from the units you have completed to ${roleTitle}, which had ${ads} job ads in ${month}`}
    >
      {/* faint survey grid: the map paper */}
      <g stroke="var(--border)" strokeWidth="1" opacity="0.55">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`v${i}`} x1={i * 80 + 40} y1="0" x2={i * 80 + 40} y2="420" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 70 + 35} x2="560" y2={i * 70 + 35} />
        ))}
      </g>

      {/* a side road that merges in — the onramp itself */}
      <path
        d="M 20,180 C 80,210 110,260 150,330"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinecap="round"
      />

      {/* main route: ink casing, then the gold line that draws itself */}
      <path
        d="M 60,390 C 130,375 120,345 150,330 S 240,290 300,252 S 380,180 430,140 S 480,105 500,84"
        fill="none"
        stroke="var(--fg)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.13"
      />
      <path
        d="M 60,390 C 130,375 120,345 150,330 S 240,290 300,252 S 380,180 430,140 S 480,105 500,84"
        fill="none"
        stroke="var(--route-strong)"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        style={
          {
            "--route-length": 1,
            animation: "route-draw 1.6s cubic-bezier(0.45, 0, 0.2, 1) 0.25s both",
          } as CSSProperties
        }
      />

      {/* you are here */}
      <circle cx="60" cy="390" r="10" fill="var(--route)" opacity="0.35">
        <animate attributeName="r" values="8;13;8" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="390" r="5" fill="var(--route-strong)" stroke="var(--bg)" strokeWidth="2" />
      <text
        x="82"
        y="395"
        className="fill-[var(--fg-muted)]"
        fontFamily="var(--font-mono-var)"
        fontSize="11"
        letterSpacing="0.12em"
      >
        YOU ARE HERE
      </text>

      {/* waypoints: the units already completed */}
      {waypoints.map((w) => (
        <g key={w.code}>
          <circle cx={w.x} cy={w.y} r="4.5" fill="var(--bg-raised)" stroke="var(--route-strong)" strokeWidth="2.5" />
          <g transform={`translate(${w.x + 12}, ${w.y - 22})`}>
            <rect
              width={w.code.length * 7.4 + 14}
              height="20"
              rx="4"
              fill="var(--bg-raised)"
              stroke="var(--border-strong)"
            />
            <text
              x="7"
              y="14"
              className="fill-[var(--fg-muted)]"
              fontFamily="var(--font-mono-var)"
              fontSize="11"
              fontWeight="600"
            >
              {w.code}
            </text>
          </g>
        </g>
      ))}

      {/* the destination sign */}
      <g transform="translate(310, 18)">
        <rect
          width="234"
          height="86"
          rx="8"
          fill="var(--sign)"
          stroke="var(--sign-border)"
          strokeWidth="2"
        />
        <rect x="14" y="16" width="30" height="20" rx="4" fill="var(--route)" stroke="var(--route-fg)" strokeWidth="1.5" opacity="0.95" />
        <text x="21" y="30.5" fill="var(--route-fg)" fontFamily="var(--font-mono-var)" fontSize="11" fontWeight="700">
          ON
        </text>
        <text x="54" y="31" fill="var(--sign-fg)" fontFamily="var(--font-sans-var)" fontSize="14" fontWeight="800" letterSpacing="0.01em">
          {roleTitle.toUpperCase()}
        </text>
        <text x="15" y="58" fill="var(--sign-fg-muted)" fontFamily="var(--font-mono-var)" fontSize="11.5">
          {ads} open ads · {month}
        </text>
        <text x="15" y="74" fill="var(--sign-fg-muted)" fontFamily="var(--font-mono-var)" fontSize="10" letterSpacing="0.08em">
          NEXT EXIT: YOUR ROADMAP
        </text>
      </g>

      {/* arrowhead where the route meets the sign */}
      <path d="M 500,84 l -7,12 M 500,84 l 3,14" stroke="var(--route-strong)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
