"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Map as MapLibreMap } from "maplibre-gl";

// "lat, lng" or "lat lng" — e.g. "23.0225, 72.5714". Place-name and
// layer-attribute search need the backend search endpoint from spec 002,
// not yet built; this covers the coordinate case client-side.
const COORD_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

export function SearchBar({
  map,
  className,
}: {
  map: MapLibreMap | null;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const match = value.match(COORD_PATTERN);
    if (!match || !map) {
      setError(true);
      return;
    }
    setError(false);
    const [, lat, lng] = match;
    map.flyTo({ center: [parseFloat(lng), parseFloat(lat)], zoom: 13 });
  }

  return (
    <div className={cn("relative max-w-md", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search location, place or coordinates..."
        aria-label="Search location, place or coordinates"
        className={cn(
          "h-9 w-full rounded-lg border border-transparent bg-muted pr-14 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          error && "ring-3 ring-destructive/20",
        )}
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
        ⌘K
      </kbd>
    </div>
  );
}
