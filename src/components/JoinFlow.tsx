/**
 * The whole mechanism as one animated diagram: four inputs flow into the
 * semantic join, ungrounded citations fall out of a code-enforced gate, and
 * three outputs leave — one of which (events) deliberately never touches
 * the model. Pure SVG + CSS; animates with `prefers-reduced-motion` off.
 */
export function JoinFlow() {
  const inputs = [
    { y: 52, label: "Completed units", sub: "UniMelb Handbook" },
    { y: 128, label: "Role requirements", sub: "O*NET 31.0" },
    { y: 204, label: "Australian demand", sub: "JSA IVI, July 2026" },
    { y: 280, label: "Semesters left", sub: "You, at onboarding" },
  ];

  return (
    <div className="scroll-x rounded-[var(--radius)] border border-border bg-bg-raised">
      <svg
        viewBox="0 0 860 400"
        className="min-w-[760px] w-full"
        role="img"
        aria-label="Four data inputs flow into the semantic join; ungrounded citations are dropped by a code-enforced filter; the gap map, roadmap and event rankings flow out"
      >
        <defs>
          <pattern id="jf-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.6" opacity="0.6" />
          </pattern>
          <marker id="jf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.5 L7.5,4 L0,7.5 z" fill="var(--fg-subtle)" />
          </marker>
        </defs>

        <rect width="860" height="400" fill="url(#jf-grid)" />

        {/* ------------------------------------------------------- inputs -- */}
        {inputs.map((input, i) => (
          <g key={input.label}>
            <rect x="16" y={input.y - 26} width="176" height="52" rx="8" fill="var(--bg-subtle)" stroke="var(--border-strong)" />
            <text x="30" y={input.y - 4} fontSize="13" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-sans-var)">
              {input.label}
            </text>
            <text x="30" y={input.y + 14} fontSize="9" fill="var(--fg-subtle)" fontFamily="var(--font-mono-var)" letterSpacing="0.08em">
              {input.sub.toUpperCase()}
            </text>
            {/* input edges into the join (demand + time skirt the model) */}
            {i < 2 ? (
              <path
                d={`M 192 ${input.y} C 268 ${input.y}, 268 166, 336 166`}
                fill="none"
                stroke="var(--route-strong)"
                strokeWidth="2"
                className="flow-dash"
              />
            ) : (
              <path
                d={`M 192 ${input.y} C 262 ${input.y}, 258 ${166 + (i - 1) * 8}, 336 ${158 + i * 8}`}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.6"
                className="flow-dash-slow"
              />
            )}
          </g>
        ))}

        {/* ---------------------------------------------------- the join -- */}
        <g>
          <circle cx="400" cy="166" r="64" fill="var(--accent-subtle)" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="400" cy="166" r="64" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.35">
            <animate attributeName="r" values="64;74;64" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0;0.35" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <text x="400" y="152" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--fg)" fontFamily="var(--font-sans-var)">
            THE SEMANTIC JOIN
          </text>
          <text x="400" y="170" textAnchor="middle" fontSize="9.5" fill="var(--fg-muted)" fontFamily="var(--font-mono-var)">
            claude-opus-5
          </text>
          <text x="400" y="186" textAnchor="middle" fontSize="9" fill="var(--fg-subtle)" fontFamily="var(--font-mono-var)">
            structured output only
          </text>
        </g>

        {/* -------------------------------------------- grounding gate -- */}
        <path d="M 464 166 L 536 166" fill="none" stroke="var(--route-strong)" strokeWidth="2" className="flow-dash" />
        <g>
          <rect x="536" y="128" width="150" height="76" rx="8" fill="var(--bg-subtle)" stroke="var(--evidence)" strokeWidth="1.6" />
          <text x="611" y="152" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="var(--fg)" fontFamily="var(--font-sans-var)">
            GROUNDING GATE
          </text>
          <text x="611" y="169" textAnchor="middle" fontSize="9" fill="var(--fg-muted)" fontFamily="var(--font-mono-var)">
            enforced in code,
          </text>
          <text x="611" y="182" textAnchor="middle" fontSize="9" fill="var(--fg-muted)" fontFamily="var(--font-mono-var)">
            not in a prompt
          </text>
        </g>

        {/* dropped citations fall out of the gate */}
        <path
          d="M 611 204 C 611 250, 611 268, 611 290"
          fill="none"
          stroke="var(--gap)"
          strokeWidth="1.6"
          strokeDasharray="3 5"
          className="flow-dash-slow"
          markerEnd="url(#jf-arrow)"
        />
        <text x="624" y="262" fontSize="9" fill="var(--gap)" fontFamily="var(--font-mono-var)">
          citations naming units you
        </text>
        <text x="624" y="275" fontSize="9" fill="var(--gap)" fontFamily="var(--font-mono-var)">
          never listed are dropped
        </text>
        <rect x="576" y="292" width="70" height="24" rx="5" fill="none" stroke="var(--gap-border)" strokeDasharray="4 3" />
        <text x="611" y="308" textAnchor="middle" fontSize="9" fill="var(--gap)" fontFamily="var(--font-mono-var)">
          discarded
        </text>

        {/* ------------------------------------------------------ outputs -- */}
        {[
          { y: 76, label: "Gap map", sub: "every claim quoted" },
          { y: 166, label: "Roadmap", sub: "paced to your semesters" },
        ].map((out) => (
          <g key={out.label}>
            <path
              d={`M 686 166 C 716 166, 716 ${out.y}, 744 ${out.y}`}
              fill="none"
              stroke="var(--route-strong)"
              strokeWidth="2"
              className="flow-dash"
            />
            <rect x="744" y={out.y - 24} width="102" height="48" rx="8" fill="var(--route-subtle)" stroke="var(--route-strong)" strokeOpacity="0.5" />
            <text x="756" y={out.y - 2} fontSize="12" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-sans-var)">
              {out.label}
            </text>
            <text x="756" y={out.y + 14} fontSize="8" fill="var(--fg-muted)" fontFamily="var(--font-mono-var)">
              {out.sub}
            </text>
          </g>
        ))}

        {/* events bypass the model entirely — worth drawing loudly */}
        <path
          d="M 192 280 C 460 322, 620 300, 744 268"
          fill="none"
          stroke="var(--evidence)"
          strokeWidth="1.8"
          className="flow-dash-slow"
        />
        <rect x="744" y="244" width="102" height="48" rx="8" fill="var(--evidence-subtle)" stroke="var(--evidence-border)" />
        <text x="756" y="266" fontSize="12" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-sans-var)">
          Events
        </text>
        <text x="756" y="282" fontSize="8" fill="var(--fg-muted)" fontFamily="var(--font-mono-var)">
          no model — deterministic
        </text>
        <text x="330" y="330" fontSize="9" fill="var(--evidence)" fontFamily="var(--font-mono-var)" letterSpacing="0.06em">
          EVENT RANKING NEVER TOUCHES THE MODEL — A SCORING FUNCTION WHOSE TERMS ARE THE REASONS SHOWN
        </text>

        {/* what never enters the pipe */}
        <rect x="16" y="330" width="176" height="52" rx="8" fill="none" stroke="var(--danger)" strokeOpacity="0.45" strokeDasharray="5 4" />
        <text x="30" y="352" fontSize="11" fontWeight="700" fill="var(--danger)" fillOpacity="0.8" fontFamily="var(--font-sans-var)">
          Name · nationality
        </text>
        <text x="30" y="368" fontSize="8.5" fill="var(--fg-subtle)" fontFamily="var(--font-mono-var)">
          never inputs, by design
        </text>
        <line x1="196" y1="356" x2="240" y2="356" stroke="var(--danger)" strokeOpacity="0.45" strokeWidth="1.4" />
        <line x1="246" y1="348" x2="262" y2="364" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
        <line x1="262" y1="348" x2="246" y2="364" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
