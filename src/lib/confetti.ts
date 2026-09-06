/*
  Gold particle burst — zero dependencies.
  Fired on small wins (e.g. marking a roadmap step done). Pulls the brand
  golds/greens straight from the CSS custom properties so light/dark both
  produce on-theme confetti.
*/

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  colour: string;
  shape: "rect" | "circle";
  born: number; // ms timestamp
};

const LIFETIME = 700; // ms — quick celebratory pop, not a snowstorm
const GRAVITY = 0.0011; // px per ms^2

// Module-level singletons so repeated bursts share one canvas + one rAF loop.
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let rafId: number | null = null;

/** Read a brand token off :root; falls back to a safe gold if missing. */
function tokenColour(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (canvas && ctx) return ctx;
  canvas = document.createElement("canvas");
  // Full-viewport overlay that never intercepts clicks.
  canvas.style.cssText =
    "position:fixed;inset:0;z-index:50;pointer-events:none;";
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  ctx?.scale(devicePixelRatio, devicePixelRatio);
  return ctx;
}

function teardown() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  canvas?.remove();
  canvas = null;
  ctx = null;
  particles = [];
}

function tick(now: number) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Advance + draw live particles; drop the expired ones.
  particles = particles.filter((p) => now - p.born < LIFETIME);
  if (particles.length === 0) {
    teardown();
    return;
  }

  for (const p of particles) {
    const age = now - p.born;
    // ~16ms step keeps physics stable enough for a 700ms effect.
    p.vy += GRAVITY * 16;
    p.x += p.vx * 16;
    p.y += p.vy * 16;
    p.rotation += p.spin;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - age / LIFETIME);
    ctx.fillStyle = p.colour;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  rafId = requestAnimationFrame(tick);
}

/** Spawn a small burst of gold/green particles at viewport coords (x, y). */
export function goldBurst(x: number, y: number): void {
  if (typeof window === "undefined") return;
  // Respect reduced motion — this is pure decoration.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!ensureCanvas()) return;

  // Gold-heavy mix: the route gold is the signature, greens as supporting cast.
  const colours = [
    tokenColour("--route", "#d4a72c"),
    tokenColour("--route", "#d4a72c"),
    tokenColour("--route-strong", "#b8860b"),
    tokenColour("--accent", "#1e6f50"),
    tokenColour("--evidence", "#2e7d8a"),
  ];

  const now = performance.now();
  for (let i = 0; i < 26; i++) {
    // Bias upwards/outwards so the burst reads like a toss, not an explosion.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = 0.15 + Math.random() * 0.35; // px per ms
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 5,
      colour: colours[Math.floor(Math.random() * colours.length)],
      shape: Math.random() < 0.6 ? "rect" : "circle",
      born: now,
    });
  }

  if (rafId === null) rafId = requestAnimationFrame(tick);
}
