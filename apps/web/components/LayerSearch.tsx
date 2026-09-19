"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rasterToggleKey, type SectionDef } from "@/lib/sections";

interface SearchEntry {
  /** Sidebar section this layer lives in. */
  section: string;
  label: string;
  /** The layer's own toggle key, in the flat namespace from lib/sections.ts. */
  key: string;
}

// Flattens the sidebar's sections into one searchable list. A raster theme
// contributes the section itself, since the section is the layer there.
function buildIndex(sections: SectionDef[]): SearchEntry[] {
  const index: SearchEntry[] = [];

  for (const section of sections) {
    if (section.mode === "layer") {
      index.push({
        section: section.label,
        label: section.label,
        key: rasterToggleKey(section.id),
      });
      continue;
    }
    for (const item of section.items) {
      // A pending item has no data to reveal — not searchable.
      if (item.pending) continue;
      index.push({ section: section.label, label: item.label, key: item.key });
    }
  }

  return index;
}

const MAX_RESULTS = 8;

// Prefix matches rank above mid-word ones, so typing "wat" surfaces
// "Watershed" before "Study Area".
function score(candidate: SearchEntry, query: string): number {
  const haystacks = [candidate.label, candidate.section];
  let best = Infinity;
  for (const text of haystacks) {
    const at = text.toLowerCase().indexOf(query);
    if (at === 0) return 0;
    if (at > 0) best = Math.min(best, at);
  }
  return best;
}

function search(index: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .map((candidate) => ({ candidate, rank: score(candidate, q) }))
    .filter(({ rank }) => rank !== Infinity)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_RESULTS)
    .map(({ candidate }) => candidate);
}

/**
 * Layer search for the header bar. A permanently visible input — typing opens
 * a result dropdown anchored under it, and picking a result switches that
 * layer's section on and turns the layer itself on.
 *
 * The dropdown is absolutely positioned rather than sitting in flow, so a long
 * result list overhangs the map instead of growing the header.
 */
export function LayerSearch({
  sections,
  visibility,
  onSelect,
  className,
}: {
  sections: SectionDef[];
  /** Toggle key → on, across every section. Drives the "On" badge. */
  visibility: Record<string, boolean>;
  onSelect: (section: string, key: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  // Whether the result list is showing. Tracked separately from `query` so a
  // click outside can dismiss the list without discarding what was typed.
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildIndex(sections), [sections]);
  const results = useMemo(() => search(index, query), [index, query]);
  const showResults = open && query.trim() !== "";

  // Clamp rather than reset: the list shrinks as the query narrows, and an
  // index left past the end would highlight nothing.
  const activeIndex = Math.min(highlighted, Math.max(results.length - 1, 0));

  // Dismiss on an outside click, so the list doesn't hang over the map after
  // the user has moved on.
  useEffect(() => {
    if (!showResults) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showResults]);

  function reset() {
    setQuery("");
    setOpen(false);
    setHighlighted(0);
  }

  function choose(result: SearchEntry) {
    onSelect(result.section, result.key);
    reset();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      reset();
      return;
    }
    if (!showResults || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (Math.min(i, results.length - 1) + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (Math.min(i, results.length - 1) + results.length - 1) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)} data-tour="search">
      {/* Deliberately the loudest control in the header bar. A white pill on a
          white band would disappear, so it reads as recessed instead of
          raised: a grey inset well against the flat band — a field that looks
          like a field, without borrowing the brand accent to say so. */}
      <div className="group/search flex h-10 items-center gap-2.5 rounded-full border border-nav-line bg-nav-soft px-3.5 shadow-[inset_0_1px_2px_oklch(0.30_0.01_96_/_0.07)] transition-[color,box-shadow,background-color,border-color] hover:border-nav-accent/45 focus-within:border-nav-accent/60 focus-within:bg-card focus-within:ring-[3px] focus-within:ring-nav-accent/20">
        <Search
          className="size-4 shrink-0 text-nav-accent transition-colors group-focus-within/search:text-foreground"
          strokeWidth={2.25}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search layers…"
          aria-label="Search layers"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="layer-search-results"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query !== "" && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            aria-label="Clear search"
            onClick={() => {
              reset();
              inputRef.current?.focus();
            }}
          >
            <X />
          </Button>
        )}
      </div>

      {showResults && (
        <div
          id="layer-search-results"
          role="listbox"
          className="absolute top-full left-0 z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-e3 ring-1 ring-black/5 scrollbar-thin"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No layer matches “{query.trim()}”.
            </p>
          ) : (
            results.map((result, i) => {
              const on = Boolean(visibility[result.key]);
              return (
                <button
                  key={result.key}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => choose(result)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                    i === activeIndex && "bg-nav-soft",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{result.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {result.section}
                    </span>
                  </span>
                  {on && (
                    <Badge className="shrink-0 bg-foreground text-[10px] text-background">On</Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
