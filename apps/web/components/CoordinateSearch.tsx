"use client";

import { useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLatLng, parseLatLng, type LatLng } from "@/lib/coords";

/**
 * Coordinate search for the header bar: type "lat, long" and the map flies
 * there and pins it (see lib/coords.ts for what parses). Layers are found
 * through the navbar pickers, not here.
 *
 * The one suggestion is absolutely positioned, so it overhangs the map
 * instead of growing the header.
 */
export function CoordinateSearch({
  onGoTo,
  className,
}: {
  /** A coordinate pair was entered: centre the map there. */
  onGoTo: (point: LatLng) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const point = parseLatLng(query);
  const showSuggestion = open && point !== null;

  function reset() {
    setQuery("");
    setOpen(false);
  }

  function goTo(target: LatLng) {
    onGoTo(target);
    reset();
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      reset();
    } else if (event.key === "Enter" && point) {
      event.preventDefault();
      goTo(point);
    }
  }

  return (
    <div className={cn("relative", className)} data-tour="search">
      {/* A grey inset well against the flat band — a field that looks like a
          field, without borrowing the brand accent to say so. */}
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
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Deferred so a click on the suggestion lands before it unmounts.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Lat, long…"
          aria-label="Go to coordinates (latitude, longitude)"
          role="combobox"
          aria-expanded={showSuggestion}
          aria-controls="coordinate-search-result"
          inputMode="decimal"
          className="h-full min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground"
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

      {showSuggestion && (
        <div
          id="coordinate-search-result"
          role="listbox"
          className="absolute top-full left-0 z-50 mt-2 w-full min-w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-e3 ring-1 ring-black/5"
        >
          <button
            type="button"
            role="option"
            aria-selected
            onClick={() => goTo(point)}
            className="flex w-full items-center gap-2 bg-nav-soft px-3 py-2 text-left"
          >
            <MapPin className="size-4 shrink-0 text-nav-accent" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
              {formatLatLng(point)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
