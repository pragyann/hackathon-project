"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";

import { VoiceOrb, type OrbMode } from "@/components/VoiceOrb";
import { Badge, Button, Card, CardBody, Eyebrow, Select, Skeleton } from "@/components/ui";
import { getRole, roles } from "@/lib/data";
import { ARCHETYPES, COMPANIES, type ArchetypeId, type CompanyId, type Debrief, type InterviewTurn } from "@/lib/interview";
import { useHydrated, useStoredProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------- browser speech -- */
/*
 * Voice runs on the browser's own speech engines (SpeechRecognition +
 * speechSynthesis): free, private, no extra keys — and honestly labelled in
 * the UI. A dedicated realtime voice model is the production path.
 */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function makeRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-AU";
  r.interimResults = true;
  r.continuous = true;
  return r;
}

/** The most natural English voice the system offers, Australian first. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const score = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (v.lang === "en-AU") n += 4;
    else if (v.lang.startsWith("en")) n += 2;
    if (/premium|enhanced|natural|neural/i.test(v.name)) n += 3;
    if (/karen|matilda|lee/i.test(v.name)) n += 2; // macOS AU voices
    return n;
  };
  return voices.sort((a, b) => score(b) - score(a))[0] ?? null;
}

function speak(text: string, enabled: boolean, onDone?: () => void) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.03;
  u.pitch = 1.0;
  u.onend = () => onDone?.();
  u.onerror = () => onDone?.();
  window.speechSynthesis.speak(u);
}

/* ----------------------------------------------------------------- page -- */

type Stage = "setup" | "live" | "debrief";

export default function InterviewPage() {
  const ready = useHydrated();
  const profile = useStoredProfile();

  const [stage, setStage] = useState<Stage>("setup");
  const [roleId, setRoleId] = useState<string>("");
  const [archetype, setArchetype] = useState<ArchetypeId>("enterprise");
  const [company, setCompany] = useState<CompanyId | null>(null);
  const [jobAd, setJobAd] = useState("");
  const [handsFree, setHandsFree] = useState(true);

  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  const [voiceOut, setVoiceOut] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [micSupported, setMicSupported] = useState(true);

  /* -- the orb's envelope: real mic RMS while listening, a synthesised
        voice envelope while the interviewer speaks ---------------------- */
  const levelRef = useRef(0);
  const speakEnv = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterRef = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);

  async function startMeter() {
    if (meterRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const holder = { ctx, stream, raf: 0 };
      meterRef.current = holder;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        levelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 5);
        holder.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* no meter — the orb just breathes */
    }
  }

  function stopMeter() {
    const m = meterRef.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((t) => t.stop());
    m.ctx.close();
    meterRef.current = null;
    levelRef.current = 0;
  }

  /** Speak a turn, animating the orb with a synthesised voice envelope. */
  function voiceTurn(text: string) {
    if (speakEnv.current) clearInterval(speakEnv.current);
    if (voiceOut) {
      setSpeaking(true);
      speakEnv.current = setInterval(() => {
        levelRef.current = 0.22 + Math.random() * 0.55;
      }, 110);
    }
    speak(text, voiceOut, () => {
      if (speakEnv.current) clearInterval(speakEnv.current);
      levelRef.current = 0;
      setSpeaking(false);
      autoListen();
    });
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, busy]);

  // Both are one-shot syncs against browser-only state (speech support,
  // localStorage profile) that is unreadable during SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSupported(Boolean(makeRecognition()));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && profile?.targetRoleId && !roleId) setRoleId(profile.targetRoleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile]);

  const candidate = {
    yearLevel: profile?.yearLevel ?? 1,
    unitCodes: [
      ...(profile?.completedUnitCodes ?? []),
      ...(profile?.manualUnits.map((u) => u.code) ?? []),
    ],
  };

  const callEngine = useCallback(
    async (turns: InterviewTurn[], action: "next" | "debrief") => {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, archetype, company, jobAd, candidate, transcript: turns, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The interview engine failed.");
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleId, archetype, company, jobAd, profile],
  );

  async function begin() {
    setStage("live");
    setBusy(true);
    setError(null);
    try {
      const { turn } = await callEngine([], "next");
      setTranscript([{ speaker: "interviewer", text: turn }]);
      voiceTurn(turn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function answer() {
    const text = draft.trim();
    if (!text || busy) return;
    stopListening();
    const next: InterviewTurn[] = [...transcript, { speaker: "candidate", text }];
    setTranscript(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const { turn } = await callEngine(next, "next");
      setTranscript([...next, { speaker: "interviewer", text: turn }]);
      voiceTurn(turn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function endInterview() {
    stopListening();
    window.speechSynthesis?.cancel();
    setBusy(true);
    setError(null);
    try {
      const { debrief } = await callEngine(transcript, "debrief");
      setDebrief(debrief);
      setStage("debrief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Latest answer() for timers set inside older closures.
  const answerRef = useRef<() => void>(() => {});
  useEffect(() => {
    answerRef.current = answer;
  });

  /** Hands-free: the interviewer stops talking, your mic opens. */
  function autoListen() {
    if (handsFree) startListening();
  }

  function startListening() {
    const rec = makeRecognition();
    if (!rec) return;
    recRef.current?.stop();
    recRef.current = rec;
    let finalText = draft ? `${draft} ` : "";
    let heardAnything = false;
    let silence: ReturnType<typeof setTimeout> | null = null;

    // In hands-free mode, ~2.2s of silence after speech ends the turn.
    const armSilenceTimer = () => {
      if (!handsFree) return;
      if (silence) clearTimeout(silence);
      silence = setTimeout(() => {
        rec.stop();
        if (heardAnything) answerRef.current();
      }, 2200);
    };

    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      heardAnything = true;
      setDraft((finalText + interim).trim());
      armSilenceTimer();
    };
    rec.onerror = () => {
      if (silence) clearTimeout(silence);
      setListening(false);
    };
    rec.onend = () => {
      if (silence) clearTimeout(silence);
      setListening(false);
      stopMeter();
    };
    rec.start();
    setListening(true);
    startMeter();
  }

  function stopListening() {
    recRef.current?.stop();
    setListening(false);
    stopMeter();
  }

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  const role = getRole(roleId || null);

  /* ------------------------------------------------------------ debrief -- */
  if (stage === "debrief" && debrief) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Eyebrow className="mb-1.5">Interview prep · debrief</Eyebrow>
        <h1 className="display text-3xl text-fg">How that went</h1>

        <Card className="mt-6">
          <CardBody className="pt-5">
            <p className="text-sm leading-relaxed text-fg">{debrief.overall}</p>
          </CardBody>
        </Card>

        <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-fg">
          What worked
        </h2>
        <ul className="mt-3 space-y-2">
          {debrief.strengths.map((s, i) => (
            <li key={i} className="flex gap-2.5 rounded-md border border-evidence-border bg-evidence-subtle px-3.5 py-2.5 text-sm text-fg">
              <Check className="mt-0.5 size-4 shrink-0 text-evidence" aria-hidden />
              {s}
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-fg">
          What to sharpen
        </h2>
        <ul className="mt-3 space-y-2">
          {debrief.improvements.map((imp, i) => (
            <li key={i} className="rounded-md border border-dashed border-gap-border bg-gap-subtle px-3.5 py-2.5">
              <p className="text-sm font-semibold text-fg">{imp.point}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{imp.example}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-md border border-route-strong/30 bg-route-subtle p-4">
          <p className="eyebrow flex items-center gap-1.5 text-route-fg">
            <Award className="size-3.5" aria-hidden />
            Practise next
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg">{debrief.practiseNext}</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => {
              setTranscript([]);
              setDebrief(null);
              setStage("setup");
            }}
          >
            Run another
          </Button>
          <Link href="/plan">
            <Button variant="secondary">Back to my plan</Button>
          </Link>
        </div>
      </main>
    );
  }

  /* --------------------------------------------------------------- live -- */
  if (stage === "live") {
    const orbMode: OrbMode = busy
      ? "thinking"
      : speaking
        ? "speaking"
        : listening
          ? "listening"
          : "idle";
    const lastQuestion =
      [...transcript].reverse().find((t) => t.speaker === "interviewer")?.text ?? "";
    const status = busy
      ? "thinking"
      : speaking
        ? "speaking"
        : listening
          ? handsFree
            ? "listening — a pause sends your answer"
            : "listening"
          : "your turn";

    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>
              Mock interview · {company ? COMPANIES[company].name : ARCHETYPES[archetype].label}
            </Eyebrow>
            <h1 className="mt-1 text-lg font-extrabold tracking-tight text-fg">
              {role?.title ?? "Interview"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceOut((v) => !v)}
              aria-pressed={voiceOut}
              aria-label={voiceOut ? "Turn interviewer voice off" : "Turn interviewer voice on"}
              className="rounded-md border border-border-strong p-2 text-fg-muted hover:text-fg"
            >
              {voiceOut ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <Button variant="secondary" size="sm" onClick={endInterview} disabled={busy || transcript.length < 2}>
              <PhoneOff className="size-3.5" aria-hidden />
              End &amp; get feedback
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------- the voice stage -- */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-sign-border bg-sign">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(42rem 24rem at 50% 0%, color-mix(in oklch, var(--sign-raised) 80%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col items-center px-6 pb-7 pt-6">
            <VoiceOrb
              mode={orbMode}
              levelRef={levelRef}
              className="block h-56 w-56 sm:h-72 sm:w-72"
            />

            <p
              className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-sign-fg-muted"
              role="status"
            >
              {status}
            </p>

            <p
              key={lastQuestion.slice(0, 40)}
              className="display fade-up mt-4 max-w-xl text-center text-lg leading-snug text-sign-fg sm:text-xl"
              aria-live="polite"
            >
              {busy && !lastQuestion ? "Connecting you to the room…" : lastQuestion}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2 text-xs text-sign-fg"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- your reply -- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            answer();
          }}
          className="mt-4"
        >
          <div className="flex items-end gap-2">
            {micSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-pressed={listening}
                aria-label={listening ? "Stop the microphone" : "Answer by voice"}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  listening
                    ? "border-danger bg-danger/10 text-danger [animation:pulse-soft_1.6s_ease-in-out_infinite]"
                    : "border-accent bg-accent text-accent-fg hover:bg-accent-hover",
                )}
              >
                {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </button>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  answer();
                }
              }}
              rows={2}
              placeholder={listening ? "Listening — speak your answer…" : "Type or tap the mic…"}
              aria-label="Your answer"
              className="flex-1 resize-none rounded-md border border-border-strong bg-bg-raised px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
            <Button type="submit" disabled={!draft.trim() || busy} aria-label="Send answer">
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
        </form>

        {/* ---------------------------------------------------- transcript -- */}
        <button
          onClick={() => setShowTranscript((v) => !v)}
          aria-expanded={showTranscript}
          className="mt-4 flex items-center gap-1.5 self-start text-xs font-semibold text-fg-muted hover:text-fg"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", showTranscript && "rotate-180")}
            aria-hidden
          />
          {showTranscript ? "Hide transcript" : `Transcript (${transcript.length})`}
        </button>
        {showTranscript && (
          <div className="mt-2 max-h-72 space-y-2.5 overflow-y-auto rounded-md border border-border bg-bg-raised p-3" ref={scrollRef}>
            {transcript.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed",
                  t.speaker === "candidate"
                    ? "ml-auto bg-accent text-accent-fg"
                    : "border border-border bg-bg-subtle text-fg",
                )}
              >
                {t.text}
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  /* -------------------------------------------------------------- setup -- */
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Eyebrow className="mb-1.5">Interview prep</Eyebrow>
      <h1 className="display text-3xl text-fg">Practise the room before the room</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
        A simulated interview for the role you are targeting, spoken aloud if you
        want it. Questions come from what the role actually involves —{" "}
        <span className="text-fg">O*NET tasks and technologies, and any real job ad you paste</span>{" "}
        — never from invented company trivia. You get a debrief at the end, not a score.
      </p>

      <Card className="mt-7">
        <CardBody className="space-y-5 pt-5">
          <div>
            <label htmlFor="int-role" className="mb-1.5 block text-sm font-semibold text-fg">
              Role
            </label>
            <Select id="int-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Choose a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
            {profile?.targetRoleId && roleId === profile.targetRoleId && (
              <p className="mt-1.5 text-xs text-fg-subtle">Pre-filled from your plan.</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-fg">
              Simulate a company that hires this role
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {(Object.keys(COMPANIES) as CompanyId[]).map((id) => {
                const c = COMPANIES[id];
                const on = company === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCompany(on ? null : id)}
                    aria-pressed={on}
                    title={c.blurb}
                    className={cn(
                      "rounded-md border p-2.5 text-left transition-colors",
                      on
                        ? "border-accent bg-accent-subtle"
                        : "border-border bg-bg-raised hover:border-border-strong",
                    )}
                  >
                    <span className="block truncate text-sm font-bold text-fg">{c.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wide text-fg-subtle">
                      {c.sector}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">
              Real employers, public facts only: the interviewer plays their sector and
              products but never invents internal process details. Paste one of their
              real ads below and it becomes the source of truth.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-fg">
              {company ? "…or clear the company and pick a generic style" : "No company? Pick a style instead"}
            </p>
            <div className={cn("grid gap-2.5 sm:grid-cols-3", company && "opacity-45")}>
              {(Object.keys(ARCHETYPES) as ArchetypeId[]).map((id) => {
                const a = ARCHETYPES[id];
                const on = !company && archetype === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setCompany(null);
                      setArchetype(id);
                    }}
                    aria-pressed={on}
                    className={cn(
                      "rounded-md border p-3 text-left transition-colors",
                      on
                        ? "border-accent bg-accent-subtle"
                        : "border-border bg-bg-raised hover:border-border-strong",
                    )}
                  >
                    <span className="block text-sm font-bold text-fg">{a.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-fg-subtle">{a.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="int-ad" className="mb-1.5 block text-sm font-semibold text-fg">
              Paste a real job ad <span className="font-normal text-fg-subtle">(optional, recommended)</span>
            </label>
            <textarea
              id="int-ad"
              value={jobAd}
              onChange={(e) => setJobAd(e.target.value)}
              rows={5}
              placeholder="Paste the responsibilities and requirements from an ad you are actually applying to — the interviewer will build its questions from them."
              className="w-full resize-y rounded-md border border-border-strong bg-bg-raised px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {profile && (
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone="neutral">Year {profile.yearLevel}</Badge>
                  <Badge tone="neutral">{candidate.unitCodes.length} units on record</Badge>
                  <Badge tone="route">Calibrated to graduate level</Badge>
                </span>
              )}
              {micSupported && (
                <label className="flex cursor-pointer items-center gap-2 text-fg-muted">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--accent)]"
                    checked={handsFree}
                    onChange={(e) => setHandsFree(e.target.checked)}
                  />
                  Hands-free voice: the mic opens when the interviewer stops talking
                </label>
              )}
            </div>
            <Button size="lg" onClick={begin} disabled={!roleId || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mic className="size-4" aria-hidden />}
              Start the interview
            </Button>
          </div>
          {error && (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
        Practice, not assessment: nothing here is scored, stored on a server, or used
        to gate you. The transcript lives in this tab and is gone when you leave.
      </p>
    </main>
  );
}
