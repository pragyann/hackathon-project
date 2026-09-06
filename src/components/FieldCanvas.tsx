"use client";

import { useEffect, useRef } from "react";

/**
 * The hero field: ~36,000 GPU particles, zero assets, raw WebGL2.
 *
 * Each particle is a student. As you scroll the hero, one buffer morphs
 * through three states — scattered (no map), merging onto the gold route
 * (the onramp), and arriving in formation at the destination. Which is the
 * entire product, drawn by the GPU.
 *
 * Honest constraints: prefers-reduced-motion renders a single still frame;
 * no WebGL2 renders nothing and the DOM hero stands alone.
 */

const VERT = `#version 300 es
precision highp float;
in vec4 aSeed;             // xyz: uniform randoms, w: particle t along route
uniform float uTime;
uniform float uMorph;      // 0 scattered -> 1 route -> 2 arrival
uniform vec2 uMouse;       // clip-space pointer
uniform float uAspect;
uniform float uDpr;
out float vShade;          // 0 ink .. 1 gold
out float vAlpha;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// cheap layered wander for the scattered state
vec2 wander(vec4 s, float t) {
  float a = s.x * 6.28318 + t * (0.12 + 0.25 * s.y);
  float b = s.y * 6.28318 - t * (0.08 + 0.2 * s.z);
  vec2 p = vec2(
    sin(a) * 0.8 + sin(b * 1.7 + s.z * 4.0) * 0.35,
    cos(a * 1.3) * 0.55 + cos(b) * 0.3
  );
  return p * vec2(1.05, 0.85);
}

// the gold route: a cubic bezier from bottom-left to upper-right
vec2 route(float t) {
  vec2 p0 = vec2(-1.05, -0.75);
  vec2 p1 = vec2(-0.25, -0.85);
  vec2 p2 = vec2( 0.05,  0.45);
  vec2 p3 = vec2( 0.92,  0.55);
  float u = 1.0 - t;
  return u*u*u*p0 + 3.0*u*u*t*p1 + 3.0*u*t*t*p2 + t*t*t*p3;
}

void main() {
  float t = fract(aSeed.w + uTime * 0.018);          // flow along the route

  // state 0: scattered
  vec2 pScatter = wander(aSeed, uTime);

  // state 1: on the route, jitter tightening as t -> 1 (merging in)
  vec2 r = route(t);
  vec2 rNext = route(min(t + 0.01, 1.0));
  vec2 tangent = normalize(rNext - r + 1e-5);
  vec2 normal = vec2(-tangent.y, tangent.x);
  float spread = mix(0.34, 0.05, t) * (aSeed.x - 0.5) * 2.0;
  vec2 pRoute = r + normal * spread + tangent * (aSeed.y - 0.5) * 0.02;

  // state 2: arrival — a dense destination block, upper right
  float col = floor(aSeed.x * 60.0);
  float row = floor(aSeed.y * 22.0);
  vec2 pArrive = vec2(0.30 + col / 60.0 * 0.62, 0.30 + row / 22.0 * 0.42);
  pArrive += vec2(hash(aSeed.z * 91.7), hash(aSeed.z * 57.3)) * 0.012;

  float m1 = clamp(uMorph, 0.0, 1.0);
  float m2 = clamp(uMorph - 1.0, 0.0, 1.0);
  // each particle commits to the merge at its own moment
  float lag1 = smoothstep(aSeed.z * 0.7, aSeed.z * 0.7 + 0.3, m1);
  float lag2 = smoothstep(aSeed.x * 0.6, aSeed.x * 0.6 + 0.4, m2);
  vec2 pos = mix(mix(pScatter, pRoute, lag1), pArrive, lag2);

  // gentle pointer repulsion
  vec2 d = pos - uMouse;
  float dist = length(d * vec2(uAspect, 1.0));
  pos += normalize(d + 1e-4) * 0.06 * exp(-dist * dist * 18.0);

  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = (mix(1.6, 3.0, aSeed.y) + lag1 * 0.8) * uDpr;

  vShade = mix(aSeed.z * 0.25, mix(t, 0.85, m2), lag1);
  vAlpha = mix(0.55, 0.9, lag1) * mix(1.0, 0.9, m2);
}`;

const FRAG = `#version 300 es
precision highp float;
in float vShade;
in float vAlpha;
uniform vec3 uInk;
uniform vec3 uGold;
uniform vec3 uGreen;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  vec3 col = mix(uInk, uGold, smoothstep(0.15, 0.9, vShade));
  col = mix(col, uGreen, smoothstep(0.75, 1.0, vShade) * 0.55);
  outColor = vec4(col, vAlpha * smoothstep(0.25, 0.05, r));
}`;

/** Resolve a CSS custom property to sRGB via a 2D canvas — the only route
    that reliably converts oklch() tokens to raw channel values. */
function cssColor(name: string): [number, number, number] {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const c2d = document.createElement("canvas");
  c2d.width = c2d.height = 1;
  const ctx = c2d.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function FieldCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
    if (!gl) return; // no WebGL2: the DOM hero stands alone

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[field]", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const COUNT = 36000;
    const seeds = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT * 4; i++) seeds[i] = Math.random();
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aSeed");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);

    const u = {
      time: gl.getUniformLocation(prog, "uTime"),
      morph: gl.getUniformLocation(prog, "uMorph"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      aspect: gl.getUniformLocation(prog, "uAspect"),
      dpr: gl.getUniformLocation(prog, "uDpr"),
      ink: gl.getUniformLocation(prog, "uInk"),
      gold: gl.getUniformLocation(prog, "uGold"),
      green: gl.getUniformLocation(prog, "uGreen"),
    };

    const setColors = () => {
      gl.uniform3fv(u.ink, cssColor("--fg"));
      gl.uniform3fv(u.gold, cssColor("--route-strong"));
      gl.uniform3fv(u.green, cssColor("--accent"));
    };
    setColors();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", setColors);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let mouse: [number, number] = [10, 10]; // offscreen until moved
    let morphTarget = 0;
    let morph = 0;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(u.dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = [
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      ];
    };
    window.addEventListener("pointermove", onPointer);

    // scroll through the hero drives the morph: chaos -> route -> arrival
    const onScroll = () => {
      const h = window.innerHeight;
      morphTarget = Math.min(2, (window.scrollY / (h * 0.9)) * 2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const frame = () => {
      morph += (morphTarget - morph) * 0.06;
      const t = reduced ? 40 : (performance.now() - start) / 1000;
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.morph, reduced ? 1 : morph);
      gl.uniform2fv(u.mouse, mouse);
      gl.uniform1f(u.aspect, canvas.width / Math.max(canvas.height, 1));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      media.removeEventListener?.("change", setColors);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
