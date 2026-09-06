"use client";

import { useEffect, useState, type JSX } from "react";
import { Button } from "@/components/ui";

type MeUser = { email: string; nudgesOptIn: boolean };

export function AccountMenu(): JSX.Element | null {
  const [user, setUser] = useState<MeUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json() as Promise<{ user?: MeUser | null }>)
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        /* logged out or DB unavailable — render nothing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* clear locally regardless */
    }
    location.reload();
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle pl-3 pr-1 py-0.5">
      <span
        className="font-mono text-xs text-fg-muted truncate max-w-[18ch]"
        title={user.email}
      >
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
        {signingOut ? "…" : "Sign out"}
      </Button>
    </div>
  );
}
