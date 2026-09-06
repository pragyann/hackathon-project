/**
 * A 60-month demand trend in 120 pixels. The IVI series ships in roles.json
 * and was previously unused; a sparkline is the honest way to show "the
 * market has tightened" instead of asserting it.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
  stroke = "var(--fg-subtle)",
  endDotFill = "var(--route-strong)",
  label,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
  endDotFill?: string;
  label?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={endDotFill} />
    </svg>
  );
}
