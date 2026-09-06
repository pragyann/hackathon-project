"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Mirrors the context shape POSTed to /api/copilot. */
export type CopilotContext = {
  roleTitle: string;
  headline: string;
  yearLevel: number;
  semestersRemaining: number;
  capabilities: { name: string; status: string; importance: string }[];
  upcomingEvents: { name: string; date: string }[];
  classHoursPerWeek: number;
  stepsDone: number;
  stepsTotal: number;
};

type Msg = { role: "user" | "assistant"; content: string };

// Starter questions for the empty state — one tap each, no typing needed.
const STARTERS = [
  "What should I do this week?",
  "Why is my readiness where it is?",
  "Which event matters most for me?",
];

/**
 * The plan-page concierge: a floating pill that opens a grounded chat over
 * the student's live plan — answers come from context, not the void.
 */
export function Copilot({ context }: { context: CopilotContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // The drawer traps Escape so keyboard users can leave the way they came.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || busy) return;
    // History is everything before this question — the API takes it separately.
    const history = messages;
    setMessages([...history, { role: "user", content }]);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, history, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The copilot failed.");
      setMessages([...history, { role: "user", content }, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating pill — the drawer's front door. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the Onramp copilot"
          className="fixed bottom-5 right-5 z-40 flex h-11 items-center gap-2 rounded-full border border-sign-border bg-sign px-4 text-sm font-bold text-sign-fg shadow-lg"
        >
          {/* Idle pulse ring; globals zero animations under reduced motion. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-sign-border animate-[pulse-soft_2.6s_ease-in-out_infinite]"
          />
          <Sparkles className="size-4" aria-hidden />
          Copilot
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Onramp copilot"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-raised shadow-[var(--shadow-lg)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-3.5">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-1.5 text-fg-subtle">
                <Sparkles className="size-3.5 text-accent" aria-hidden />
                Onramp copilot
              </p>
              <h2 className="mt-1 truncate text-sm font-bold text-fg" title={context.roleTitle}>
                {context.roleTitle} · year {context.yearLevel}
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close the copilot"
              className="rounded p-1 text-fg-subtle hover:bg-bg hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-xs leading-relaxed text-fg-muted">
                <p className="font-semibold text-fg">Ask about your plan.</p>
                <p className="mt-1.5">
                  The copilot only knows what is on this page — your capabilities,
                  roadmap progress and upcoming events. Try one of these:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STARTERS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={busy}
                      className="rounded-full border border-border-strong bg-bg px-3 py-1.5 text-xs text-fg hover:border-accent-border hover:bg-accent-subtle"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[88%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-accent text-accent-fg"
                    : "border border-border bg-bg-subtle text-fg",
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-fg-subtle">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Thinking…
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
              send();
            }}
            className="flex items-end gap-2 border-t border-border px-3 py-3"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Ask about your plan…"
              aria-label="Message the copilot"
              className="flex-1 resize-none rounded-md border border-border-strong bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
            />
            <Button type="submit" size="sm" disabled={!draft.trim() || busy} aria-label="Send">
              <Send className="size-4" aria-hidden />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
