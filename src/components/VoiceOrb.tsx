"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * The interviewer, embodied: a fragment-shader orb in the wayfinding palette.
 * Idle it breathes; speaking it pulses gold with the voice envelope;
 * listening it ripples green off the student's real microphone level;
 * thinking it slowly swirls. One fullscreen triangle, zero assets.
 */

export type OrbMode = "idle" | "speaking" | "listening" | "thinking";
const MODE_INDEX: Record<OrbMode, number> = { idle: 0, speaking: 1, listening: 2, thinking: 3 };

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;   // 0..1 voice/mic envelope
uniform float uMode;    // 0 idle · 1 speaking · 2 listening · 3 thinking
uniform vec3 uGreen;
uniform vec3 uGold;
uniform vec3 uInk;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float len = length(p);
  float ang = atan(p.y, p.x);
  vec2 dir = vec2(cos(ang), sin(ang));

  bool speaking = abs(uMode - 1.0) < 0.5;
  bool listening = abs(uMode - 2.0) < 0.5;
  bool thinking = abs(uMode - 3.0) < 0.5;

  // surface wobble: calm at idle, voice-driven when someone is talking
  float amp = speaking ? 0.05 + uLevel * 0.09
            : listening ? 0.03 + uLevel * 0.12
            : thinking ? 0.035
            : 0.022;
  float speed = thinking ? 0.9 : 0.55;
  float wob = fbm(dir * 1.9 + uTime * speed) - 0.5;
  float wob2 = fbm(dir * 3.7 - uTime * speed * 0.7) - 0.5;

  float breath = 0.012 * sin(uTime * 1.4);
  float baseR = 0.56 + breath + uLevel * 0.05 + wob * amp + wob2 * amp * 0.6;

  float d = len - baseR;

  // palette by mode: gold voice, green ear, ink rest
  vec3 core = speaking ? mix(uGold, uGreen, 0.15)
            : listening ? mix(uGreen, uGold, 0.1)
            : mix(uGreen, uInk, 0.35);
  vec3 rim = speaking ? uGold : listening ? uGreen : mix(uGold, uInk, 0.4);

  // interior: soft radial gradient + drifting internal weather
  float inner = smoothstep(baseR, 0.0, len);
  float weather = fbm(p * 2.6 + vec2(uTime * 0.12, -uTime * 0.09));
  vec3 col = mix(core * 0.55, core, inner) + (weather - 0.5) * 0.12;

  // rim light + outer glow
  float rimBand = exp(-abs(d) * 26.0);
  float glow = exp(-max(d, 0.0) * 5.5) * (0.35 + uLevel * 0.5);
  col += rim * rimBand * 0.9 + rim * glow * 0.5;

  // thinking: a slow orbiting highlight
  if (thinking) {
    float orbiter = exp(-40.0 * abs(len - baseR + 0.02)) *
      (0.5 + 0.5 * cos(ang - uTime * 2.2));
    col += uGold * orbiter * 0.8;
  }

  float alpha = smoothstep(0.02, -0.01, d) * 0.96 + glow * 0.55;
  outColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`;

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

export function VoiceOrb({
  mode,
  levelRef,
  className,
}: {
  mode: OrbMode;
  /** 0..1 envelope, written by the page (mic RMS or speech envelope). */
  levelRef: MutableRefObject<number>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true });
    if (!gl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[orb]", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
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

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      level: gl.getUniformLocation(prog, "uLevel"),
      mode: gl.getUniformLocation(prog, "uMode"),
      green: gl.getUniformLocation(prog, "uGreen"),
      gold: gl.getUniformLocation(prog, "uGold"),
      ink: gl.getUniformLocation(prog, "uInk"),
    };
    gl.uniform3fv(u.green, cssColor("--accent"));
    gl.uniform3fv(u.gold, cssColor("--route-strong"));
    gl.uniform3fv(u.ink, cssColor("--fg-muted"));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let level = 0;
    const start = performance.now();
    const frame = () => {
      // smooth the envelope so the surface never snaps
      level += (levelRef.current - level) * 0.18;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, (performance.now() - start) / 1000);
      gl.uniform1f(u.level, level);
      gl.uniform1f(u.mode, MODE_INDEX[modeRef.current]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
    };
  }, [levelRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
