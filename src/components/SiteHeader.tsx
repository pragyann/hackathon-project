import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AccountMenu } from "@/components/AccountMenu";
import { RouteShield } from "@/components/RouteShield";

/**
 * One header everywhere. The landing, wizard and plan previously each rolled
 * their own (or had none); a persistent wayfinding bar is the point of the
 * design language.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <RouteShield />
          <span className="text-[15px] font-extrabold tracking-tight text-fg">
            Onramp
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <Link
            href="/method"
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
          >
            How it works
          </Link>
          <Link
            href="/plan"
            className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg sm:block"
          >
            My plan
          </Link>
          <Link
            href="/planner"
            className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg md:block"
          >
            Calendar
          </Link>
          <Link
            href="/interview"
            className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg md:block"
          >
            Interview prep
          </Link>
          <AccountMenu />
          <Link
            href="/start"
            className="ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3.5 text-sm font-semibold text-accent-fg shadow-sm transition-colors hover:bg-accent-hover"
          >
            Map my gap
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
