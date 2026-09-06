"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, CardBody, Eyebrow, Input, Label } from "@/components/ui";
import { saveAnalysis, saveProfile } from "@/lib/store";
import type { Analysis, StudentProfile } from "@/lib/types";

const DISMISS_KEY = "onramp.nudge.dismissed";

type MeUser = { email: string; nudgesOptIn: boolean };

type Snapshot = { profile: unknown; analysis: unknown };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AccountNudge({
  getSnapshot,
}: {
  getSnapshot: () => Snapshot;
}): JSX.Element | null {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const syncedOnce = useRef(false);

  // Keep the server copy fresh once we know we're signed in.
  const pushSnapshot = useCallback(() => {
    const snap = getSnapshot();
    void fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
    }).catch(() => {
      /* fire-and-forget */
    });
  }, [getSnapshot]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sessionStorage read, unreadable during SSR
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      /* sessionStorage unavailable */
    }

    let cancelled = false;
    fetch("/api/auth/me")
      .then(readJson)
      .then((data) => {
        if (cancelled) return;
        const u = (data.user ?? null) as MeUser | null;
        setUser(u);
        setChecked(true);
        if (u && !syncedOnce.current) {
          syncedOnce.current = true;
          pushSnapshot();
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pushSnapshot]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleAuthed = (email: string, nudgesOptIn: boolean) => {
    setUser({ email, nudgesOptIn });
    setModalOpen(false);
  };

  if (!checked) return null;

  if (user) {
    return (
      <div
        className={cn(
          "fixed bottom-5 left-5 z-30 rounded-full px-3 py-1.5",
          "border border-evidence-border bg-evidence-subtle text-evidence",
          "font-mono text-[11px]",
        )}
      >
        Synced &middot; {user.email}
      </div>
    );
  }

  return (
    <>
      {!dismissed && !modalOpen && (
        <Card className="fixed bottom-5 left-5 z-30 max-w-sm shadow-lg">
          <CardBody className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <Eyebrow className="mb-2">Keep this plan</Eyebrow>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={handleDismiss}
                className="text-fg-subtle hover:text-fg transition-colors -mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">
              Create a free account and this plan follows you — synced across
              devices, with a check-in here at the start of each semester.
              Local-only stays the default; delete everything any time.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Create account
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
      {modalOpen && (
        <AuthModal
          getSnapshot={getSnapshot}
          onClose={() => setModalOpen(false)}
          onAuthed={handleAuthed}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- Modal -- */

function AuthModal({
  getSnapshot,
  onClose,
  onAuthed,
}: {
  getSnapshot: () => Snapshot;
  onClose: () => void;
  onAuthed: (email: string, nudgesOptIn: boolean) => void;
}) {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nudgesOptIn, setNudgesOptIn] = useState(true);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || !passwordValid) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            nudgesOptIn,
            ...getSnapshot(),
          }),
        });
        const data = await readJson(res);
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Something went wrong — please try again.",
          );
          return;
        }
        onAuthed(email, nudgesOptIn);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await readJson(res);
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Incorrect email or password.",
          );
          return;
        }
        const profile = (data.profile ?? null) as StudentProfile | null;
        const analysis = (data.analysis ?? null) as Analysis | null;
        if (profile || analysis) {
          if (profile) saveProfile(profile);
          if (analysis) saveAnalysis(analysis);
        } else {
          // Nothing on the server yet — push the local snapshot up.
          void fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(getSnapshot()),
          }).catch(() => {
            /* fire-and-forget */
          });
        }
        onAuthed(email, true);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tab === "signup" ? "Create account" : "Log in"}
    >
      <div
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardBody className="pt-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 rounded-md border border-border bg-bg-subtle p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setError(null);
                }}
                className={cn(
                  "rounded px-3 py-1 text-xs font-semibold transition-colors",
                  tab === "signup"
                    ? "bg-bg-raised text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                }}
                className={cn(
                  "rounded px-3 py-1 text-xs font-semibold transition-colors",
                  tab === "login"
                    ? "bg-bg-raised text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                Log in
              </button>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="text-fg-subtle hover:text-fg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-fg-muted mb-4">
            {tab === "signup"
              ? "Sync this plan across devices. Check-ins land here in the app; email is the production path."
              : "Welcome back — your saved plan loads after you sign in."}
          </p>

          <form onSubmit={submit} noValidate>
            <div className="space-y-3">
              <div>
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                {touched && !emailValid && (
                  <p className="mt-1 text-xs text-danger">
                    Enter a valid email address.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="account-password">Password</Label>
                <Input
                  id="account-password"
                  type="password"
                  autoComplete={
                    tab === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                {touched && !passwordValid && (
                  <p className="mt-1 text-xs text-danger">
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>
              {tab === "signup" && (
                <label className="flex items-start gap-2 text-sm text-fg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nudgesOptIn}
                    onChange={(e) => setNudgesOptIn(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent,currentColor)]"
                  />
                  <span>Semester check-ins in the app</span>
                </label>
              )}
            </div>

            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-4 w-full" disabled={loading}>
              {loading
                ? "Working…"
                : tab === "signup"
                  ? "Create account"
                  : "Log in"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
