import Link from "next/link";

import { RouteShield } from "@/components/RouteShield";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-subtle">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <RouteShield />
              <span className="text-sm font-extrabold tracking-tight text-fg">Onramp</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fg-muted">
              Onramp recommends; you decide. Nothing here scores, ranks or gates a
              student, and no recommendation uses your name, background or
              nationality.
            </p>
          </div>

          <div className="text-xs leading-relaxed text-fg-subtle">
            <p className="eyebrow mb-2 text-fg-muted">Every number has a source</p>
            <ul className="space-y-1">
              <li>Role content — O*NET 31.0, US Dept of Labor (CC BY 4.0)</li>
              <li>Australian demand — Jobs and Skills Australia IVI, July 2026</li>
              <li>Unit content — University of Melbourne Handbook 2026</li>
              <li>Events — organisers&rsquo; public listings, verified by hand</li>
            </ul>
            <Link
              href="/method"
              className="mt-3 inline-block font-medium text-accent hover:underline"
            >
              The whole mechanism, including what is wrong with it →
            </Link>
          </div>
        </div>

        <p className="mt-8 border-t border-border pt-4 text-[11px] text-fg-subtle">
          MentorME Futura Remix Hackathon — Track 2, Education and Student Success.
          Your profile lives in your browser; the analysis runs server-side and is
          not stored.
        </p>
      </div>
    </footer>
  );
}
