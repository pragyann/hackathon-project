"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Select,
  SectionHeading,
} from "@/components/ui";
import { degrees, roles } from "@/lib/data";
import { emptyProfile, saveAnalysis, saveProfile } from "@/lib/store";
import type { StudentProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const STEPS = ["About you", "What you have done", "Where you are heading"] as const;

/**
 * Two profiles differing only in stage. This is the demo: same degree, same
 * target role, materially different roadmap. `open-questions.md` §3 argues this
 * is the single most convincing thing to put in front of a judge, and it proves
 * the personalisation is real rather than a static roadmap with a name on it.
 */
const DEMO_PROFILES: { label: string; note: string; profile: StudentProfile }[] = [
  {
    label: "Arjun, first year",
    note: "6 semesters left · 2 units done",
    profile: {
      ...emptyProfile,
      name: "Arjun",
      degreeId: "unimelb-bsci-cis",
      yearLevel: 1,
      semestersRemaining: 6,
      completedUnitCodes: ["COMP10001", "COMP10002"],
      targetRoleId: "software-developer",
    },
  },
  {
    label: "Priya, final year",
    note: "1 semester left · 4 units done",
    profile: {
      ...emptyProfile,
      name: "Priya",
      degreeId: "unimelb-bsci-cis",
      yearLevel: 3,
      semestersRemaining: 1,
      completedUnitCodes: ["COMP10001", "COMP10002", "COMP20003", "COMP20005"],
      targetRoleId: "software-developer",
    },
  },
];

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [manualCode, setManualCode] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const degree = degrees.find((d) => d.id === profile.degreeId) ?? null;
  const patch = (p: Partial<StudentProfile>) => setProfile((prev) => ({ ...prev, ...p }));

  const unitCount = profile.completedUnitCodes.length + profile.manualUnits.length;
  const canContinue = [
    Boolean(profile.degreeId),
    unitCount > 0,
    Boolean(profile.targetRoleId),
  ][step];

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      saveProfile(profile);
      saveAnalysis(data);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Onramp
          </Link>
          <span className="text-xs text-fg-subtle">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Stepper step={step} />

        {/* ------------------------------------------------ 1. about you -- */}
        {step === 0 && (
          <div className="mt-10">
            <SectionHeading
              title="Tell us where you are in your degree"
              description="Year level is the input that changes everything downstream — it decides whether you get a three-year arc or a triage list. Nothing here is used to rank or score you."
            />

            <Card>
              <CardBody className="pt-5 space-y-5">
                <div>
                  <Label htmlFor="degree">Your degree</Label>
                  <Select
                    id="degree"
                    value={profile.degreeId}
                    onChange={(e) => patch({ degreeId: e.target.value, completedUnitCodes: [] })}
                  >
                    <option value="">Choose a degree…</option>
                    {degrees.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.institution}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-xs text-fg-subtle">
                    Only two degrees are seeded for this prototype. Studying something
                    else? You can still type your units in on the next step.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="year">Year of study</Label>
                    <Select
                      id="year"
                      value={profile.yearLevel}
                      onChange={(e) => patch({ yearLevel: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sems">Semesters until you graduate</Label>
                    <Select
                      id="sems"
                      value={profile.semestersRemaining}
                      onChange={(e) => patch({ semestersRemaining: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          {s} semester{s === 1 ? "" : "s"}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Select
                      id="city"
                      value={profile.city}
                      onChange={(e) => patch({ city: e.target.value })}
                    >
                      <option>Melbourne</option>
                    </Select>
                    <p className="mt-1.5 text-xs text-fg-subtle">
                      Melbourne only for now — the event data is curated by hand.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="name">First name (optional)</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      placeholder="Only used to say hello"
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                    <p className="mt-1.5 text-xs text-fg-subtle">
                      Never used in any recommendation.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="mt-6 rounded-[var(--radius)] border border-border bg-bg-subtle p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Or load a worked example
              </p>
              <p className="mt-1.5 text-sm text-fg-muted">
                Same degree, same target role, different stage. That contrast is the
                whole idea.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO_PROFILES.map((d) => (
                  <button
                    key={d.label}
                    aria-label={`Load worked example: ${d.label}, ${d.note}`}
                    onClick={() => {
                      setProfile(d.profile);
                      setStep(2);
                    }}
                    className="rounded-lg border border-border-strong bg-bg-raised px-3 py-2 text-left transition-colors hover:border-accent-border hover:bg-accent-subtle"
                  >
                    <div className="text-sm font-medium text-fg">{d.label}</div>
                    <div className="text-xs text-fg-subtle">{d.note}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------- 2. coursework -- */}
        {step === 1 && (
          <div className="mt-10">
            <SectionHeading
              title="Confirm what you have completed"
              description="Tick what you have finished. This should feel like confirming, not data entry — and every recommendation you get will trace back to something on this list."
            />

            {degree && (
              <Card>
                <CardBody className="pt-5">
                  <div className="space-y-2">
                    {degree.units.map((u) => {
                      const on = profile.completedUnitCodes.includes(u.code);
                      return (
                        <button
                          key={u.code}
                          onClick={() =>
                            patch({
                              completedUnitCodes: on
                                ? profile.completedUnitCodes.filter((c) => c !== u.code)
                                : [...profile.completedUnitCodes, u.code],
                            })
                          }
                          aria-pressed={on}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            on
                              ? "border-evidence-border bg-evidence-subtle"
                              : "border-border hover:border-border-strong hover:bg-bg-subtle",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border",
                              on
                                ? "border-evidence bg-evidence text-white"
                                : "border-border-strong",
                            )}
                            aria-hidden
                          >
                            {on && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-fg-muted">
                                {u.code}
                              </span>
                              <span className="text-sm font-medium text-fg">{u.title}</span>
                              <Badge tone="neutral">Year {u.yearLevel}</Badge>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* The universal fallback. prd.md P0-2 requires this path always exist,
                and with only two degrees seeded it is the path most students take. */}
            <Card className="mt-5">
              <CardBody className="pt-5">
                <h3 className="text-sm font-semibold text-fg">
                  Add a unit we do not have
                </h3>
                <p className="mt-1 text-xs text-fg-muted">
                  Studying elsewhere, or took an elective outside this list? Type it in.
                  We will match on the title, and we will be more cautious about it
                  because we do not have the university&rsquo;s description.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    className="w-32 font-mono"
                    placeholder="CAB201"
                    aria-label="Unit code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  />
                  <Input
                    className="w-56 flex-1 min-w-40"
                    placeholder="Programming Principles"
                    aria-label="Unit title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={!manualCode.trim() || !manualTitle.trim()}
                    onClick={() => {
                      patch({
                        manualUnits: [
                          ...profile.manualUnits,
                          { code: manualCode.trim(), title: manualTitle.trim() },
                        ],
                      });
                      setManualCode("");
                      setManualTitle("");
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add
                  </Button>
                </div>

                {profile.manualUnits.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {profile.manualUnits.map((u, i) => (
                      <li key={`${u.code}-${i}`}>
                        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-subtle py-1 pl-2.5 pr-1 text-xs">
                          <span className="font-mono">{u.code}</span>
                          <span className="text-fg-muted">{u.title}</span>
                          <button
                            aria-label={`Remove ${u.code}`}
                            onClick={() =>
                              patch({
                                manualUnits: profile.manualUnits.filter((_, j) => j !== i),
                              })
                            }
                            className="rounded p-0.5 text-fg-subtle hover:bg-bg hover:text-fg"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------ 3. role -- */}
        {step === 2 && (
          <div className="mt-10">
            <SectionHeading
              title="What are you aiming at?"
              description="Not sure? That is the normal answer, especially early on. Pick anything that sounds plausible — you can change it, and seeing the requirements is often how people work out what they want."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((r) => {
                const on = profile.targetRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => patch({ targetRoleId: r.id, exploring: false })}
                    aria-pressed={on}
                    className={cn(
                      "rounded-[var(--radius)] border p-4 text-left transition-colors",
                      on
                        ? "border-accent bg-accent-subtle"
                        : "border-border bg-bg-raised hover:border-border-strong",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{r.title}</span>
                      {on && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                    </div>
                    {r.demand && (
                      <p className="mt-2 font-mono text-xs text-fg-muted">
                        {formatNumber(r.demand.latestAds)} ads · {r.demand.latestMonth}
                      </p>
                    )}
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-subtle">
                      {r.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border bg-bg-subtle p-4">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={profile.exploring}
                onChange={(e) => patch({ exploring: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium text-fg">
                  I am still working out what I want
                </span>
                <span className="mt-1 block text-xs text-fg-muted">
                  We will treat this as a direction to explore rather than a decision,
                  and frame the plan as evidence-gathering.
                </span>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------- footer -- */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={run} disabled={!canContinue || busy} size="lg">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Mapping your gap…
                </>
              ) : (
                <>
                  Show me the gap
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </Button>
          )}
        </div>

        {busy && (
          <p className="mt-3 text-right text-xs text-fg-subtle">
            Reading your units against what the role actually requires. Takes around a
            minute.
          </p>
        )}
      </div>
    </main>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done && "bg-evidence text-white",
                now && "bg-accent text-accent-fg",
                !done && !now && "bg-bg-subtle text-fg-subtle",
              )}
              aria-hidden
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs sm:block",
                now ? "font-medium text-fg" : "text-fg-subtle",
              )}
              aria-current={now ? "step" : undefined}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
