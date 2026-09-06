"use client";

import { useEffect, useRef } from "react";

/**
 * The hero field: a GPU particle system of the student's actual material —
 * mathematical and programming glyphs drifting over a bed of fine dots.
 * Zero assets: the glyph atlas is drawn onto a canvas at runtime and the
 * rest is two shaders.
 *
 * As you scroll, one buffer morphs through three states — scattered (no
 * map), merging onto the gold route (the onramp), and arriving in formation
 * at the destination. Which is the entire product, drawn by the GPU.
 *
 * prefers-reduced-motion renders a single still frame; no WebGL2 renders
 * nothing and the DOM hero stands alone.
 */

const GLYPHS =
  "{}()[]<>;=+-*/%&|!?#~^π∑∫√∞≠≤λΔθƒ→±∈∀01xyne@$:.".split("");
const ATLAS_COLS = 8;
const ATLAS_ROWS = Math.ceil(GLYPHS.length / 8);

const DOT_COUNT = 22000;
const GLYPH_COUNT = 2200;
const COUNT = DOT_COUNT + GLYPH_COUNT;

const VERT = `#version 300 es
precision highp float;
in vec4 aSeed;             // xyz: uniform randoms, w: particle t along route
in float aGlyph;           // -1 = plain dot, else glyph index in the atlas
uniform float uTime;
uniform float uMorph;      // 0 scattered -> 1 route -> 2 arrival
uniform vec2 uMouse;
uniform float uAspect;
uniform float uDpr;
out float vShade;
out float vAlpha;
out float vGlyph;
out float vSpin;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

vec2 wander(vec4 s, float t) {
  float a = s.x * 6.28318 + t * (0.12 + 0.25 * s.y);
  float b = s.y * 6.28318 - t * (0.08 + 0.2 * s.z);
  vec2 p = vec2(
    sin(a) * 0.8 + sin(b * 1.7 + s.z * 4.0) * 0.35,
    cos(a * 1.3) * 0.55 + cos(b) * 0.3
  );
  return p * vec2(1.05, 0.85);
}

vec2 route(float t) {
  vec2 p0 = vec2(-1.05, -0.75);
  vec2 p1 = vec2(-0.25, -0.85);
  vec2 p2 = vec2( 0.05,  0.45);
  vec2 p3 = vec2( 0.92,  0.55);
  float u = 1.0 - t;
  return u*u*u*p0 + 3.0*u*u*t*p1 + 3.0*u*t*t*p2 + t*t*t*p3;
}

void main() {
  float t = fract(aSeed.w + uTime * 0.018);

  vec2 pScatter = wander(aSeed, uTime);

  vec2 r = route(t);
  vec2 rNext = route(min(t + 0.01, 1.0));
  vec2 tangent = normalize(rNext - r + 1e-5);
  vec2 normal = vec2(-tangent.y, tangent.x);
  float spread = mix(0.34, 0.05, t) * (aSeed.x - 0.5) * 2.0;
  vec2 pRoute = r + normal * spread + tangent * (aSeed.y - 0.5) * 0.02;

  float col = floor(aSeed.x * 60.0);
  float row = floor(aSeed.y * 22.0);
  vec2 pArrive = vec2(0.30 + col / 60.0 * 0.62, 0.30 + row / 22.0 * 0.42);
  pArrive += vec2(hash(aSeed.z * 91.7), hash(aSeed.z * 57.3)) * 0.012;

  float m1 = clamp(uMorph, 0.0, 1.0);
  float m2 = clamp(uMorph - 1.0, 0.0, 1.0);
  float lag1 = smoothstep(aSeed.z * 0.7, aSeed.z * 0.7 + 0.3, m1);
  float lag2 = smoothstep(aSeed.x * 0.6, aSeed.x * 0.6 + 0.4, m2);
  vec2 pos = mix(mix(pScatter, pRoute, lag1), pArrive, lag2);

  vec2 d = pos - uMouse;
  float dist = length(d * vec2(uAspect, 1.0));
  pos += normalize(d + 1e-4) * 0.06 * exp(-dist * dist * 18.0);

  gl_Position = vec4(pos, 0.0, 1.0);

  bool isGlyph = aGlyph >= 0.0;
  float dotSize = mix(1.6, 3.0, aSeed.y) + lag1 * 0.8;
  float glyphSize = mix(11.0, 26.0, aSeed.y * aSeed.y);
  gl_PointSize = (isGlyph ? glyphSize : dotSize) * uDpr;

  vShade = mix(aSeed.z * 0.25, mix(t, 0.85, m2), lag1);
  // glyphs sit quieter than dots so the headline stays readable
  vAlpha = (isGlyph ? mix(0.16, 0.5, aSeed.z) + lag1 * 0.25
                    : mix(0.5, 0.9, lag1)) * mix(1.0, 0.9, m2);
  vGlyph = aGlyph;
  // slow individual tumble, straightening out as they merge onto the route
  vSpin = (aSeed.x - 0.5) * 1.6 * (1.0 - lag1 * 0.8)
        + sin(uTime * (0.2 + aSeed.y * 0.3) + aSeed.z * 6.28) * 0.35 * (1.0 - lag1);
}`;

const FRAG = `#version 300 es
precision highp float;
in float vShade;
in float vAlpha;
in float vGlyph;
in float vSpin;
uniform vec3 uInk;
uniform vec3 uGold;
uniform vec3 uGreen;
uniform sampler2D uAtlas;
out vec4 outColor;

void main() {
  vec3 col = mix(uInk, uGold, smoothstep(0.15, 0.9, vShade));
  col = mix(col, uGreen, smoothstep(0.75, 1.0, vShade) * 0.55);

  if (vGlyph < 0.0) {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;
    outColor = vec4(col, vAlpha * smoothstep(0.25, 0.05, r));
  } else {
    // rotate the sprite, then sample its cell in the glyph atlas
    vec2 p = gl_PointCoord - 0.5;
    float cs = cos(vSpin), sn = sin(vSpin);
    p = mat2(cs, -sn, sn, cs) * p + 0.5;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
    float cx = mod(vGlyph, ${ATLAS_COLS}.0);
    float cy = floor(vGlyph / ${ATLAS_COLS}.0);
    vec2 uv = (vec2(cx, cy) + p) / vec2(${ATLAS_COLS}.0, ${ATLAS_ROWS}.0);
    float a = texture(uAtlas, uv).a;
    if (a < 0.05) discard;
    outColor = vec4(col, a * vAlpha);
  }
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

/** The maths-and-code glyph atlas, drawn at runtime. Zero assets. */
function buildAtlas(): HTMLCanvasElement {
  const CELL = 64;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL;
  canvas.height = ATLAS_ROWS * CELL;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${CELL * 0.62}px "Overpass Mono", ui-monospace, monospace`;
  GLYPHS.forEach((g, i) => {
    const x = (i % ATLAS_COLS) * CELL + CELL / 2;
    const y = Math.floor(i / ATLAS_COLS) * CELL + CELL / 2 + CELL * 0.03;
    ctx.fillText(g, x, y);
  });
  return canvas;
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

    // seeds + glyph assignment: dots first, then glyph sprites
    const seeds = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT * 4; i++) seeds[i] = Math.random();
    const glyphs = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      glyphs[i] = i < DOT_COUNT ? -1 : Math.floor(Math.random() * GLYPHS.length);
    }

    const seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const seedLoc = gl.getAttribLocation(prog, "aSeed");
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 4, gl.FLOAT, false, 0, 0);

    const glyphBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glyphBuf);
    gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);
    const glyphLoc = gl.getAttribLocation(prog, "aGlyph");
    gl.enableVertexAttribArray(glyphLoc);
    gl.vertexAttribPointer(glyphLoc, 1, gl.FLOAT, false, 0, 0);

    // glyph atlas texture
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = {
      time: gl.getUniformLocation(prog, "uTime"),
      morph: gl.getUniformLocation(prog, "uMorph"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      aspect: gl.getUniformLocation(prog, "uAspect"),
      dpr: gl.getUniformLocation(prog, "uDpr"),
      ink: gl.getUniformLocation(prog, "uInk"),
      gold: gl.getUniformLocation(prog, "uGold"),
      green: gl.getUniformLocation(prog, "uGreen"),
      atlas: gl.getUniformLocation(prog, "uAtlas"),
    };
    gl.uniform1i(u.atlas, 0);

    const setColors = () => {
      gl.uniform3fv(u.ink, cssColor("--fg"));
      gl.uniform3fv(u.gold, cssColor("--route-strong"));
      gl.uniform3fv(u.green, cssColor("--accent"));
    };
    setColors();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", setColors);

    // fonts may land after first paint; redraw the atlas once they have
    document.fonts?.ready.then(() => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas());
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let mouse: [number, number] = [10, 10];
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
      gl.deleteBuffer(seedBuf);
      gl.deleteBuffer(glyphBuf);
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
