"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X, Zap } from "lucide-react";

import { Sparkline } from "@/components/Sparkline";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Eyebrow,
  Input,
  Label,
  Select,
  SectionHeading,
} from "@/components/ui";
import arjunFixture from "@/data/fixtures/arjun.json";
import priyaFixture from "@/data/fixtures/priya.json";
import { degrees, roles } from "@/lib/data";
import { emptyProfile, loadProfile, saveAnalysis, saveProfile, clearAnalysis } from "@/lib/store";
import type { Analysis, StudentProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const STEPS = ["Where you are", "What you have done", "Where you are heading"] as const;

/**
 * Two profiles differing only in stage, with precomputed analyses. This is the
 * demo: same degree, same target role, materially different roadmap — and it
 * loads instantly, with no API key, because judges should not wait on a model
 * to see the thesis. Honest labelling: the plan page says it is precomputed.
 */
const DEMO_PROFILES: {
  label: string;
  note: string;
  profile: StudentProfile;
  fixture: Analysis;
}[] = [
  {
    label: "Arjun, first year",
    note: "6 semesters left · 2 units done",
    fixture: arjunFixture as unknown as Analysis,
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
    fixture: priyaFixture as unknown as Analysis,
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
  const [skillDraft, setSkillDraft] = useState("");

  // Returning students edit their saved profile rather than starting over.
  // localStorage is unreadable during SSR, so this must wait for the client;
  // a one-shot post-mount sync is the intended pattern here.
  useEffect(() => {
    const saved = loadProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setProfile(saved);
  }, []);

  const degree = degrees.find((d) => d.id === profile.degreeId) ?? null;
  const patch = (p: Partial<StudentProfile>) => setProfile((prev) => ({ ...prev, ...p }));

  const unitCount = profile.completedUnitCodes.length + profile.manualUnits.length;
  const canContinue = [
    Boolean(profile.degreeId),
    unitCount > 0,
    Boolean(profile.targetRoleId),
  ][step];

  /** Save and hand over to /plan, which runs the two-call pipeline visibly. */
  function run() {
    saveProfile(profile);
    clearAnalysis();
    router.push("/plan?run=1");
  }

  function loadDemo(demo: (typeof DEMO_PROFILES)[number]) {
    saveProfile(demo.profile);
    saveAnalysis({ ...demo.fixture, precomputed: true });
    router.push("/plan");
  }

  function addSkill() {
    const s = skillDraft.trim();
    if (!s || profile.resumeSkills.includes(s)) return;
    patch({ resumeSkills: [...profile.resumeSkills, s] });
    setSkillDraft("");
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Eyebrow className="mb-2">Under three minutes, three steps</Eyebrow>
        <Stepper step={step} />

        {/* ------------------------------------------------ 1. about you -- */}
        {step === 0 && (
          <div className="mt-10 fade-up">
            <SectionHeading
              eyebrow="Step 01"
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

            <div className="mt-6 rounded-[var(--radius)] border border-route-strong/30 bg-route-subtle p-4">
              <p className="eyebrow text-route-fg">
                <Zap className="mr-1 inline size-3" aria-hidden />
                Or load a worked example — instant, precomputed
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
                    onClick={() => loadDemo(d)}
                    className="rounded-md border border-border-strong bg-bg-raised px-3 py-2 text-left transition-colors hover:border-route-strong hover:shadow-sm"
                  >
                    <div className="text-sm font-semibold text-fg">{d.label}</div>
                    <div className="font-mono text-[11px] text-fg-subtle">{d.note}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------- 2. coursework -- */}
        {step === 1 && (
          <div className="mt-10 fade-up">
            <SectionHeading
              eyebrow="Step 02"
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
                            "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
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
                              <span className="font-mono text-xs font-semibold text-fg-muted">
                                {u.code}
                              </span>
                              <span className="text-sm font-semibold text-fg">{u.title}</span>
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
                <h3 className="text-sm font-bold text-fg">Add a unit we do not have</h3>
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
                        <span className="inline-flex items-center gap-2 rounded border border-border bg-bg-subtle py-1 pl-2.5 pr-1 text-xs">
                          <span className="font-mono font-semibold">{u.code}</span>
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

            {/* Skills outside coursework — the input the prompt already accepts. */}
            <Card className="mt-5">
              <CardBody className="pt-5">
                <h3 className="text-sm font-bold text-fg">
                  Anything you have picked up outside the degree?
                </h3>
                <p className="mt-1 text-xs text-fg-muted">
                  A language from a side project, a tool from a part-time job. Optional,
                  and it sharpens the gap map.
                </p>
                <div className="mt-3 flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="e.g. Python side projects, Figma, retail POS systems"
                    aria-label="A skill"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button variant="secondary" disabled={!skillDraft.trim()} onClick={addSkill}>
                    <Plus className="size-4" aria-hidden />
                    Add
                  </Button>
                </div>
                {profile.resumeSkills.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {profile.resumeSkills.map((s) => (
                      <li key={s}>
                        <span className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-subtle py-1 pl-2.5 pr-1 text-xs">
                          {s}
                          <button
                            aria-label={`Remove ${s}`}
                            onClick={() =>
                              patch({ resumeSkills: profile.resumeSkills.filter((x) => x !== s) })
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
          <div className="mt-10 fade-up">
            <SectionHeading
              eyebrow="Step 03"
              title="What are you aiming at?"
              description="Not sure? That is the normal answer, especially early on. Pick anything that sounds plausible — you can change it, and seeing the requirements is often how people work out what they want."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((r) => {
                const on = profile.targetRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => patch({ targetRoleId: r.id })}
                    aria-pressed={on}
                    className={cn(
                      "rounded-[var(--radius)] border p-4 text-left transition-all",
                      on
                        ? "border-accent bg-accent-subtle shadow-sm"
                        : "border-border bg-bg-raised hover:border-border-strong",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-fg">{r.title}</span>
                      {on && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                    </div>
                    {r.demand && (
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="font-mono text-xs text-fg-muted">
                          {formatNumber(r.demand.latestAds)} ads
                          <span className="text-fg-subtle"> · {r.demand.latestMonth}</span>
                        </p>
                        <Sparkline
                          data={r.demand.trend}
                          width={84}
                          height={24}
                          label={`Five-year demand trend for ${r.title}`}
                        />
                      </div>
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
                className="mt-0.5 size-4 accent-[var(--accent)]"
                checked={profile.exploring}
                onChange={(e) => patch({ exploring: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-semibold text-fg">
                  I am still working out what I want
                </span>
                <span className="mt-1 block text-xs text-fg-muted">
                  We will treat this as a direction to explore rather than a decision,
                  and frame the plan as evidence-gathering.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* ------------------------------------------------------- footer -- */}
        <div className="mt-8 flex items-center justify-between">
          {step === 0 ? (
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Home
            </Link>
          ) : (
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={run} disabled={!canContinue} size="lg">
              Map my gap
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

/** The three steps drawn as a route: markers joined by road, gold when live. */
function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[5px] border-2 font-mono text-xs font-bold",
                done && "border-evidence bg-evidence-subtle text-evidence",
                now && "border-route-fg/60 bg-route text-route-fg",
                !done && !now && "border-border bg-bg-subtle text-fg-subtle",
              )}
              aria-hidden
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs sm:block",
                now ? "font-semibold text-fg" : "text-fg-subtle",
              )}
              aria-current={now ? "step" : undefined}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn("h-0.5 flex-1 rounded", done ? "bg-evidence" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
