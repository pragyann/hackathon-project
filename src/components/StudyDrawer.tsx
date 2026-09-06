"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type StudyContext = {
  stepTitle: string;
  stepRationale: string;
  roleTitle: string;
  unitCodes: string[];
  yearLevel: number;
};

type Msg = { role: "user" | "assistant"; content: string };

/**
 * The study assistant, scoped deliberately to one roadmap step at a time —
 * a tutor for the thing you are doing this week, not a genie for the degree.
 */
export function StudyDrawer({
  context,
  onClose,
}: {
  context: StudyContext;
  onClose: () => void;
}) {
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The assistant failed.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Study assistant: ${context.stepTitle}`}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-raised shadow-[var(--shadow-lg)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-3.5">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5 text-fg-subtle">
            <GraduationCap className="size-3.5 text-accent" aria-hidden />
            Study assistant
          </p>
          <h2 className="mt-1 truncate text-sm font-bold text-fg" title={context.stepTitle}>
            {context.stepTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close the study assistant"
          className="rounded p-1 text-fg-subtle hover:bg-bg hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-xs leading-relaxed text-fg-muted">
            <p className="font-semibold text-fg">A tutor for this step, not a genie.</p>
            <p className="mt-1.5">
              Ask it to explain a concept, set you a small exercise, or review your
              attempt. It builds on the units you have done and it will not write
              the project for you — shipping it yourself is the point.
            </p>
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
          placeholder="Ask about this step…"
          aria-label="Message the study assistant"
          className="flex-1 resize-none rounded-md border border-border-strong bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
        />
        <Button type="submit" size="sm" disabled={!draft.trim() || busy} aria-label="Send">
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
