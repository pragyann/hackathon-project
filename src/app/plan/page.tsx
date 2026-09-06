"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, PencilLine, RefreshCw, ShieldCheck, Trash2, Zap } from "lucide-react";

import { EventList } from "@/components/EventList";
import { GapMap } from "@/components/GapMap";
import { RoadmapView } from "@/components/RoadmapView";
import { Sparkline } from "@/components/Sparkline";
import { Button, Card, CardBody, Eyebrow, Skeleton } from "@/components/ui";
import { getDegree, getRole, rankEvents } from "@/lib/data";
import {
  clearEverything,
  loadAnalysis,
  saveAnalysis,
  useHydrated,
  useStoredAnalysis,
  useStoredProfile,
} from "@/lib/store";
import type { StudentProfile } from "@/lib/types";
import { cn, formatNumber, formatSignedPercent } from "@/lib/utils";

const TABS = ["Gap map", "Roadmap", "Events"] as const;
type Tab = (typeof TABS)[number];

/** URL slugs so a tab can be linked, shared and returned to. */
const TAB_SLUGS: Record<Tab, string> = {
  "Gap map": "gap",
  Roadmap: "roadmap",
  Events: "events",
};

type Phase = "idle" | "gap" | "roadmap" | "done" | "error";

/**
 * The two-call pipeline, run where the student can watch it. The gap map
 * renders the moment call 1 lands; the roadmap streams in behind it. Each
 * phase fails independently and retries independently.
 */
function usePipeline(profile: StudentProfile | null) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (!profile || running.current) return;
    running.current = true;
    setError(null);

    try {
      // Resume-aware: an interrupted run keeps its gap and only redoes the rest.
      let analysis = loadAnalysis();

      if (!analysis) {
        setPhase("gap");
        const res = await fetch("/api/gap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "The gap analysis failed.");
        analysis = { gap: data.gap, grounding: data.grounding, roadmap: null };
        saveAnalysis(analysis);
      }

      if (!analysis.roadmap) {
        setPhase("roadmap");
        const outstanding = analysis.gap.capabilities.filter(
          (c) => c.status !== "evidenced",
        );
        const res = await fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, outstanding }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "The roadmap failed.");
        saveAnalysis({ ...analysis, roadmap: data.roadmap });
      }

      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    } finally {
      running.current = false;
    }
  }, [profile]);

  return { phase, error, run };
}

export default function PlanPage() {
  const router = useRouter();
  const profile = useStoredProfile();
  const analysis = useStoredAnalysis();
  const [tab, setTabState] = useState<Tab>("Gap map");
  const ready = useHydrated();

  // The active tab lives in the URL (?tab=roadmap), so a judge can deep-link
  // any view and the back button behaves.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("tab");
    const found = TABS.find((t) => TAB_SLUGS[t] === slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot URL read after mount; the URL is unreadable during SSR
    if (found) setTabState(found);
  }, []);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", TAB_SLUGS[t]);
    url.searchParams.delete("run");
    window.history.replaceState(null, "", url);
  }, []);
  const { phase, error, run } = usePipeline(profile);

  // Arriving from /start with ?run=1 kicks the pipeline off; arriving with an
  // interrupted analysis (gap saved, roadmap missing) resumes it.
  const kicked = useRef(false);
  useEffect(() => {
    if (!ready || kicked.current || !profile) return;
    const wantsRun = new URLSearchParams(window.location.search).has("run");
    const incomplete = analysis && !analysis.roadmap && !analysis.precomputed;
    if ((wantsRun && !analysis) || incomplete) {
      kicked.current = true;
      run();
    }
  }, [ready, profile, analysis, run]);

  const role = getRole(profile?.targetRoleId ?? null);
  const degree = getDegree(profile?.degreeId ?? null);

  const ranked = useMemo(() => {
    if (!profile) return [];
    const outstanding =
      analysis?.gap.capabilities.filter((c) => c.status !== "evidenced") ?? [];
    return rankEvents(profile, role, outstanding);
  }, [profile, role, analysis]);

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (!profile || !role) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-6 py-24 text-center">
        <Eyebrow className="mb-3">No route planned</Eyebrow>
        <h1 className="display text-2xl text-fg">Nothing to show yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Tell us what you have studied and what you are aiming at, and we will map
          the gap between the two.
        </p>
        <Link href="/start" className="mt-6 inline-block">
          <Button size="lg">Get started</Button>
        </Link>
      </main>
    );
  }

  const demand = role.demand;
  const gapReady = Boolean(analysis);
  const roadmapReady = Boolean(analysis?.roadmap);

  return (
    <main className="flex-1">
      {/* ------------------------------------------- destination sign ----- */}
      <header className="border-b border-sign-border bg-sign text-sign-fg">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-3xl">
              <p className="eyebrow text-sign-fg-muted">
                Destination
                {profile.exploring && " · exploring, not deciding"}
              </p>
              <h1 className="display-sign mt-1.5 text-3xl text-sign-fg sm:text-4xl">
                {role.title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-sign-fg-muted">
                {profile.name ? `${profile.name} — year` : "Year"} {profile.yearLevel},{" "}
                {degree ? `${degree.name}, ` : ""}
                {profile.semestersRemaining} semester
                {profile.semestersRemaining === 1 ? "" : "s"} to graduation ·{" "}
                {profile.city}
              </p>
              {gapReady && (
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sign-fg">
                  {analysis!.gap.headline}
                </p>
              )}
            </div>

            {demand && (
              <div className="shrink-0 rounded-md border border-sign-border bg-sign-raised px-4 py-3">
                <p className="eyebrow text-sign-fg-muted">Australian demand</p>
                <div className="mt-1 flex items-end gap-3">
                  <span className="font-mono text-2xl font-bold leading-none text-sign-fg">
                    {formatNumber(demand.latestAds)}
                  </span>
                  <span className="pb-0.5 font-mono text-xs text-sign-fg-muted">
                    ads · {formatSignedPercent(demand.yearOnYearPct)} y/y
                  </span>
                </div>
                <Sparkline
                  data={demand.trend}
                  width={168}
                  height={30}
                  stroke="var(--sign-fg-muted)"
                  endDotFill="var(--route)"
                  className="mt-2"
                  label={`Five-year demand trend for ${role.title}`}
                />
                <p className="mt-1.5 max-w-[190px] font-mono text-[9.5px] leading-snug text-sign-fg-muted/80">
                  ANZSCO {role.anzscoCode} · {role.mappingConfidence} confidence
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {analysis?.precomputed && (
              <span className="inline-flex items-center gap-1.5 rounded border border-route-strong/50 bg-route/15 px-2 py-0.5 font-mono text-[11px] text-route">
                <Zap className="size-3" aria-hidden />
                Precomputed worked example
              </span>
            )}
            <Link
              href="/start"
              className="inline-flex items-center gap-1.5 text-sign-fg-muted transition-colors hover:text-sign-fg"
            >
              <PencilLine className="size-3.5" aria-hidden />
              Edit my details
            </Link>
            <button
              onClick={() => {
                clearEverything();
                router.push("/");
              }}
              className="inline-flex items-center gap-1.5 text-sign-fg-muted transition-colors hover:text-sign-fg"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete my data
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------- progress ----- */}
      {(phase === "gap" || phase === "roadmap" || phase === "error") && (
        <div className="border-b border-border bg-bg-subtle">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <ol className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <ProgressStep
                state={gapReady ? "done" : phase === "error" && !gapReady ? "failed" : "running"}
                label={
                  gapReady
                    ? `${analysis!.gap.capabilities.length} capabilities mapped from your units`
                    : "Reading your units against the role"
                }
              />
              <ProgressStep
                state={
                  roadmapReady
                    ? "done"
                    : phase === "roadmap"
                      ? "running"
                      : phase === "error" && gapReady
                        ? "failed"
                        : "waiting"
                }
                label={
                  roadmapReady
                    ? "Roadmap sequenced"
                    : `Sequencing ${profile.semestersRemaining} semester${
                        profile.semestersRemaining === 1 ? "" : "s"
                      } — the model is weighing time against breadth`
                }
              />
            </ol>
            {phase === "error" && (
              <div
                role="alert"
                className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger"
              >
                <span>{error}</span>
                <Button size="sm" variant="secondary" onClick={run}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ tabs -- */}
      <div className="sticky top-14 z-30 border-b border-border bg-bg">
        <div className="mx-auto max-w-6xl px-6">
          <nav className="scroll-x flex gap-1" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  tab === t
                    ? "border-route-strong text-fg"
                    : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {t}
                {t === "Roadmap" && !roadmapReady && gapReady && (
                  <Loader2 className="ml-1.5 inline size-3 animate-spin text-fg-subtle" aria-hidden />
                )}
                {t === "Events" && (
                  <span className="ml-1.5 font-mono text-xs text-fg-subtle">
                    {ranked.filter((r) => r.stageFit !== "advanced").length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {tab === "Gap map" &&
          (gapReady ? (
            <GapMap capabilities={analysis!.gap.capabilities} />
          ) : (
            <PendingPanel
              spinning={phase !== "error"}
              label={
                phase === "error"
                  ? "The analysis has not run yet — fix the error above and retry."
                  : "The gap map appears as soon as your units have been read against the role — usually under half a minute."
              }
            />
          ))}

        {tab === "Roadmap" &&
          (roadmapReady ? (
            <RoadmapView
              roadmap={analysis!.roadmap!}
              studyContextFor={(step) => ({
                stepTitle: step.title,
                stepRationale: step.rationale,
                roleTitle: role.title,
                unitCodes: analysis!.grounding.unitCodes,
                yearLevel: profile.yearLevel,
              })}
            />
          ) : (
            <PendingPanel
              spinning={phase !== "error"}
              label={
                phase === "error"
                  ? "The roadmap has not been sequenced yet — fix the error above and retry."
                  : gapReady
                    ? "Sequencing your semesters now. The gap map is already in — take a look while this finishes."
                    : "The roadmap is built from the gap map, so it arrives second."
              }
            />
          ))}

        {tab === "Events" && (
          <>
            <p className="mb-5 max-w-2xl text-sm text-fg-muted">
              Ranked against your target role, what is still missing from your
              roadmap, and where you are in your degree. Every reason is shown.
            </p>
            <EventList ranked={ranked} />
          </>
        )}

        {/* ------------------------------------------------------ grounding -- */}
        {gapReady && (
          <Card className="mt-10">
            <CardBody className="pt-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-evidence" aria-hidden />
                <div className="text-xs leading-relaxed text-fg-muted">
                  <p className="text-sm font-bold text-fg">What this was built from</p>
                  <p className="mt-1.5">
                    Role requirements from O*NET 31.0 (CC BY 4.0). Australian demand from
                    the Jobs and Skills Australia Internet Vacancy Index. Unit content
                    quoted from the University of Melbourne Handbook. Events curated by
                    hand from organisers&rsquo; public listings — not a live feed.
                  </p>
                  <p className="mt-2">
                    Every claim about what you already have is quoted from a unit
                    description you confirmed.
                    {analysis!.grounding.droppedUngrounded > 0 ? (
                      <>
                        {" "}
                        {analysis!.grounding.droppedUngrounded} suggested citation
                        {analysis!.grounding.droppedUngrounded === 1 ? " was" : "s were"}{" "}
                        dropped for not matching a unit on your list.
                      </>
                    ) : (
                      " Nothing was dropped for being ungrounded."
                    )}
                  </p>
                  <p className="mt-2">
                    Onramp recommends; you decide. Your name, background and nationality
                    are never used in any recommendation, and nothing here scores or
                    gates you.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function ProgressStep({
  state,
  label,
}: {
  state: "waiting" | "running" | "done" | "failed";
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      {state === "done" && (
        <span className="flex size-5 items-center justify-center rounded-full bg-evidence text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}
      {state === "running" && <Loader2 className="size-4 animate-spin text-route-strong" aria-hidden />}
      {state === "waiting" && <span className="size-2 rounded-full bg-border-strong" aria-hidden />}
      {state === "failed" && <span className="size-2 rounded-full bg-danger" aria-hidden />}
      <span className={cn(state === "waiting" ? "text-fg-subtle" : "text-fg-muted")}>{label}</span>
    </li>
  );
}

function PendingPanel({ label, spinning = true }: { label: string; spinning?: boolean }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border-strong bg-bg-subtle px-6 py-12 text-center">
      {spinning && (
        <Loader2 className="mx-auto mb-3 size-5 animate-spin text-route-strong" aria-hidden />
      )}
      <p className="mx-auto max-w-md text-sm leading-relaxed text-fg-muted">{label}</p>
    </div>
  );
}
