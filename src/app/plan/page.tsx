"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";

import { EventList } from "@/components/EventList";
import { GapMap } from "@/components/GapMap";
import { RoadmapView } from "@/components/RoadmapView";
import { Badge, Button, Card, CardBody, Skeleton } from "@/components/ui";
import { getDegree, getRole, rankEvents } from "@/lib/data";
import {
  clearEverything,
  useHydrated,
  useStoredAnalysis,
  useStoredProfile,
} from "@/lib/store";

import { cn, formatNumber, formatSignedPercent } from "@/lib/utils";

const TABS = ["Gap", "Roadmap", "Events"] as const;

export default function PlanPage() {
  const router = useRouter();
  const profile = useStoredProfile();
  const analysis = useStoredAnalysis();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Gap");

  const ready = useHydrated();

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
      <main className="mx-auto max-w-6xl flex-1 px-6 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (!profile || !analysis || !role) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight">No plan yet</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Tell us what you have studied and what you are aiming at, and we will map
          the gap.
        </p>
        <Link href="/start" className="mt-6 inline-block">
          <Button>Get started</Button>
        </Link>
      </main>
    );
  }

  const demand = role.demand;

  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------- header -- */}
      <header className="border-b border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Onramp
            </Link>
            <button
              onClick={() => {
                clearEverything();
                router.push("/");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-fg-subtle hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete my data
            </button>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">
            {profile.name ? `${profile.name}, here` : "Here"} is the gap between your
            coursework and {role.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              Year {profile.yearLevel} · {profile.semestersRemaining} semester
              {profile.semestersRemaining === 1 ? "" : "s"} left
            </Badge>
            {degree && <Badge tone="neutral">{degree.name}</Badge>}
            <Badge tone="neutral">{profile.city}</Badge>
            {profile.exploring && <Badge tone="partial">Exploring</Badge>}
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
            {analysis.gap.headline}
          </p>

          {demand && (
            <p className="mt-3 text-xs text-fg-subtle">
              {role.title} maps to ANZSCO {role.anzscoCode} ({demand.anzscoTitle}),
              advertising{" "}
              <span className="font-mono text-fg-muted">
                {formatNumber(demand.latestAds)}
              </span>{" "}
              roles nationally in {demand.latestMonth} —{" "}
              <span className="font-mono text-gap">
                {formatSignedPercent(demand.yearOnYearPct)}
              </span>{" "}
              year on year.{" "}
              <span className="text-fg-subtle">
                Mapping confidence: {role.mappingConfidence}. {role.mappingNote}
              </span>
            </p>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------ tabs -- */}
      <div className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex gap-1" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={cn(
                  "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  tab === t
                    ? "border-accent text-fg"
                    : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {t}
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

      <div className="mx-auto max-w-6xl px-6 py-8">
        {tab === "Gap" && <GapMap capabilities={analysis.gap.capabilities} />}
        {tab === "Roadmap" && <RoadmapView roadmap={analysis.roadmap} />}
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
        <Card className="mt-10">
          <CardBody className="pt-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-evidence" aria-hidden />
              <div className="text-xs leading-relaxed text-fg-muted">
                <p className="font-medium text-fg">What this was built from</p>
                <p className="mt-1.5">
                  Role requirements from O*NET 31.0 (CC BY 4.0). Australian demand from
                  the Jobs and Skills Australia Internet Vacancy Index. Unit content
                  quoted from the University of Melbourne Handbook. Events curated by
                  hand from organisers&rsquo; public listings — not a live feed.
                </p>
                <p className="mt-2">
                  Every claim about what you already have is quoted from a unit
                  description you confirmed.
                  {analysis.grounding.droppedUngrounded > 0 ? (
                    <>
                      {" "}
                      {analysis.grounding.droppedUngrounded} suggested citation
                      {analysis.grounding.droppedUngrounded === 1 ? " was" : "s were"}{" "}
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
      </div>
    </main>
  );
}
