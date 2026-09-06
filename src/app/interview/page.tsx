"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  Check,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Badge, Button, Card, CardBody, Eyebrow, Select, Skeleton } from "@/components/ui";
import { getRole, roles } from "@/lib/data";
import { ARCHETYPES, type ArchetypeId, type Debrief, type InterviewTurn } from "@/lib/interview";
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

function speak(text: string, enabled: boolean, onDone?: () => void) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const au = window.speechSynthesis.getVoices().find((v) => v.lang === "en-AU");
  if (au) u.voice = au;
  u.rate = 1.02;
  u.onend = () => onDone?.();
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
  const [jobAd, setJobAd] = useState("");

  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  const [voiceOut, setVoiceOut] = useState(true);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [micSupported, setMicSupported] = useState(true);

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
        body: JSON.stringify({ roleId, archetype, jobAd, candidate, transcript: turns, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The interview engine failed.");
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleId, archetype, jobAd, profile],
  );

  async function begin() {
    setStage("live");
    setBusy(true);
    setError(null);
    try {
      const { turn } = await callEngine([], "next");
      setTranscript([{ speaker: "interviewer", text: turn }]);
      speak(turn, voiceOut);
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
      speak(turn, voiceOut);
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

  function startListening() {
    const rec = makeRecognition();
    if (!rec) return;
    recRef.current?.stop();
    recRef.current = rec;
    let finalText = draft ? `${draft} ` : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setDraft((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  function stopListening() {
    recRef.current?.stop();
    setListening(false);
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
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Mock interview · {ARCHETYPES[archetype].label}</Eyebrow>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-fg">
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

        <div
          ref={scrollRef}
          className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-[var(--radius)] border border-border bg-bg-raised p-4"
          style={{ minHeight: "40vh", maxHeight: "55vh" }}
        >
          {transcript.map((t, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-md px-3.5 py-2.5 text-sm leading-relaxed",
                t.speaker === "candidate"
                  ? "ml-auto bg-accent text-accent-fg"
                  : "border border-border bg-bg-subtle text-fg",
              )}
            >
              {t.speaker === "interviewer" && (
                <span className="eyebrow mb-1 block text-fg-subtle">Interviewer</span>
              )}
              {t.text}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-fg-subtle">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Interviewer is thinking…
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            answer();
          }}
          className="mt-3"
        >
          <div className="flex items-end gap-2">
            {micSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-pressed={listening}
                aria-label={listening ? "Stop the microphone" : "Answer by voice"}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  listening
                    ? "border-danger bg-danger/10 text-danger [animation:pulse-soft_1.6s_ease-in-out_infinite]"
                    : "border-border-strong text-fg-muted hover:border-accent hover:text-accent",
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
              placeholder={listening ? "Listening — speak your answer…" : "Type or speak your answer…"}
              aria-label="Your answer"
              className="flex-1 resize-none rounded-md border border-border-strong bg-bg-raised px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
            <Button type="submit" disabled={!draft.trim() || busy} aria-label="Send answer">
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-fg-subtle">
            Voice runs on your browser&rsquo;s built-in speech engine — free and private.
            {!micSupported && " Your browser has no speech recognition; typing works fine."}
          </p>
        </form>
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
            <p className="mb-1.5 text-sm font-semibold text-fg">Who is interviewing you?</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {(Object.keys(ARCHETYPES) as ArchetypeId[]).map((id) => {
                const a = ARCHETYPES[id];
                const on = archetype === id;
                return (
                  <button
                    key={id}
                    onClick={() => setArchetype(id)}
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
            <p className="mt-2 text-xs text-fg-subtle">
              Archetypes, not named companies — we will not invent facts about a real
              employer&rsquo;s process. Paste a real ad below and it becomes the source of truth.
            </p>
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
            <div className="flex flex-wrap gap-1.5 text-xs">
              {profile && (
                <>
                  <Badge tone="neutral">Year {profile.yearLevel}</Badge>
                  <Badge tone="neutral">{candidate.unitCodes.length} units on record</Badge>
                  <Badge tone="route">Calibrated to graduate level</Badge>
                </>
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
