"use client";

/*
  Cmd/Ctrl+K command palette. Renders nothing until toggled, so it costs
  nothing on the page until the user reaches for it.
*/

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

/** Fuzzy substring: query chars must appear in order, case-insensitive. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let ti = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (ti === -1) return false;
    ti++;
  }
  return true;
}

export function CommandPalette({
  actions,
}: {
  actions: PaletteAction[];
}): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => actions.filter((a) => fuzzyMatch(query, a.label)),
    [actions, query]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  // Global shortcut: Cmd/Ctrl+K toggles, Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            setQuery("");
            setSelected(0);
          }
          return !v;
        });
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus the search box the moment the panel mounts.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Clamp at render time so a narrowing filter never strands the selection —
  // no effect needed, the derived value is always in range.
  const sel = Math.min(selected, Math.max(0, filtered.length - 1));

  if (!open) return null;

  function runAction(action: PaletteAction) {
    close();
    action.run();
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(Math.min(sel + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(Math.max(sel - 1, 0));
    } else if (e.key === "Enter" && filtered[sel]) {
      e.preventDefault();
      runAction(filtered[sel]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop — click anywhere outside the panel to dismiss. */}
      <div
        className="absolute inset-0 bg-fg/20 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-[var(--radius)] border border-border bg-bg-raised shadow-lg overflow-hidden fade-up">
        {/* Search row */}
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-fg-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Type a command…"
            className="w-full bg-transparent py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            aria-activedescendant={
              filtered[sel] ? `palette-option-${filtered[sel].id}` : undefined
            }
          />
        </div>

        {/* Results */}
        <ul
          id="palette-listbox"
          role="listbox"
          aria-label="Commands"
          className="max-h-72 overflow-y-auto py-1"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">
              No matching commands
            </li>
          )}
          {filtered.map((action, i) => (
            <li
              key={action.id}
              id={`palette-option-${action.id}`}
              role="option"
              aria-selected={i === sel}
              onMouseEnter={() => setSelected(i)}
              onClick={() => runAction(action)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 px-3 py-2 text-sm",
                i === sel
                  ? "bg-accent-subtle text-fg"
                  : "text-fg-muted"
              )}
            >
              <span>{action.label}</span>
              {action.hint && (
                <span className="font-mono text-xs text-fg-subtle">
                  {action.hint}
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Footer microcopy */}
        <div className="border-t border-border bg-bg-subtle px-3 py-1.5 font-mono text-[11px] text-fg-subtle">
          ↑↓ navigate · ↵ run · esc close
        </div>
      </div>
    </div>
  );
}
