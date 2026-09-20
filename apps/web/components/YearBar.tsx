"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Columns2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RasterYear } from "@/lib/sections";

/** How long each year holds while the timeline is playing. */
const PLAY_STEP_MS = 1400;

// Shared, so the no-theme fallback below doesn't hand the play effect a fresh
// array identity every render and restart its interval.
const NO_YEARS: RasterYear[] = [];

export interface TemporalTheme {
  id: string;
  label: string;
  years: RasterYear[];
}

/**
 * The brief's Year Bar: a timeline across the bottom of the map for stepping
 * a raster theme through its years, with a play control and a compare mode.
 *
 * It drives one theme at a time. Several temporal themes can be switched on
 * at once now, each holding its own year, so the bar names the theme it is
 * driving and offers a picker to point it at another — rather than silently
 * moving whichever the user last touched, or moving all of them together.
 *
 * Comparison is an opacity blend: both years draw, and one slider fades
 * between them. Reading precise change at a boundary is harder than with a
 * swipe divider, but it composes with everything else on the map instead of
 * cutting the viewport in two.
 */
export function YearBar({
  themes,
  focusedId,
  onFocusChange,
  year,
  onYearChange,
  playing,
  onPlayingChange,
  compareYear,
  onCompareYearChange,
  blend,
  onBlendChange,
  className,
}: {
  /** Every switched-on theme that has more than one year. */
  themes: TemporalTheme[];
  focusedId: string;
  onFocusChange: (id: string) => void;
  year: number | null;
  onYearChange: (year: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  /** null when compare mode is off. */
  compareYear: number | null;
  onCompareYearChange: (year: number | null) => void;
  /** 0 = only the base year, 1 = only the compared year. */
  blend: number;
  onBlendChange: (blend: number) => void;
  className?: string;
}) {
  const theme = themes.find((t) => t.id === focusedId) ?? themes[0];
  const years = theme?.years ?? NO_YEARS;
  const index = years.findIndex((y) => y.year === year);
  const current = index >= 0 ? index : years.length - 1;

  // Advancing is driven from here rather than from the parent so the parent
  // holds no timer: the bar unmounts the moment no temporal theme is on, and
  // the interval goes with it.
  const onYearChangeRef = useRef(onYearChange);
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => {
    onYearChangeRef.current = onYearChange;
    onPlayingChangeRef.current = onPlayingChange;
  });

  useEffect(() => {
    if (!playing || years.length < 2) return;
    const timer = setInterval(() => {
      const next = current + 1;
      if (next >= years.length) {
        // Stop at the end rather than looping — a loop makes it hard to tell
        // the newest year from the oldest at a glance.
        onPlayingChangeRef.current(false);
        return;
      }
      onYearChangeRef.current(years[next].year);
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, current, years]);

  if (!theme || years.length < 2) return null;

  const comparing = compareYear !== null;
  const compareLabel = years.find((y) => y.year === compareYear)?.label;

  return (
    <div
      data-tour="year-bar"
      className={cn(
        // Fills the band its container leaves free rather than capping at a
        // fixed width, so the year ticks and the compare control get room
        // instead of crowding into the middle of the map. The cap only bites
        // on a very wide screen, where a bar spanning the whole map would be
        // more travel than the control is worth.
        "flex w-full max-w-[72rem] flex-col gap-2 rounded-2xl bg-card/95 px-3 py-2.5 shadow-e3 ring-1 ring-foreground/10 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          size="icon-sm"
          className="shrink-0 rounded-full"
          aria-label={playing ? "Pause the timeline" : "Play through the years"}
          onClick={() => {
            if (playing) {
              onPlayingChange(false);
              return;
            }
            // Pressing play on the last year would otherwise stop immediately
            // and look broken. Newest year is the default, so that is the
            // common case, not an edge one.
            if (current >= years.length - 1) onYearChange(years[0].year);
            onPlayingChange(true);
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        {/* Which theme the bar drives. A plain label when there is only one, so
            a picker with a single option never appears. */}
        <div className="min-w-0 shrink-0">
          {themes.length > 1 ? (
            <Select value={theme.id} onValueChange={onFocusChange}>
              <SelectTrigger
                className="h-7 w-48 border-0 bg-transparent px-1 text-xs font-medium shadow-none"
                aria-label="Which layer the timeline controls"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="truncate px-1 text-xs font-medium">{theme.label}</p>
          )}
          <p className="px-1 text-[10px] text-muted-foreground">{years.length} years</p>
        </div>

        {/* The timeline. A row of ticks rather than a slider: the years are
            unevenly spaced (1980, 1989, 1998, 2008, 2018, 2025, 2026) and a
            proportional axis would crush the recent ones together. */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto scrollbar-thin">
          {years.map((y, i) => {
            const active = i === current;
            const compared = y.year === compareYear;
            return (
              <button
                key={y.year}
                type="button"
                aria-current={active}
                onClick={() => onYearChange(y.year)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs tabular-nums transition-colors",
                  active && "bg-primary font-semibold text-primary-foreground",
                  !active && compared && "bg-primary/20 font-medium text-foreground",
                  !active && !compared && "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                )}
              >
                {y.label}
              </button>
            );
          })}
        </div>

        <Button
          variant={comparing ? "default" : "outline"}
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            if (comparing) {
              onCompareYearChange(null);
              return;
            }
            // Open against the earliest year that is not the one already
            // showing, so the control starts on a comparison worth seeing.
            const other = years.find((y) => y.year !== years[current].year) ?? years[0];
            onCompareYearChange(other.year);
            onBlendChange(0.5);
          }}
        >
          {comparing ? <X /> : <Columns2 />}
          {comparing ? "Stop comparing" : "Compare two years"}
        </Button>
      </div>

      {comparing && (
        <div className="flex items-center gap-3 border-t border-border/60 pt-2">
          <Select
            value={String(compareYear)}
            onValueChange={(v) => onCompareYearChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-32 text-xs" aria-label="Year to compare against">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.year} value={String(y.year)}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="shrink-0 text-[11px] text-muted-foreground">
            {years[current]?.label}
          </span>
          <Slider
            value={[Math.round(blend * 100)]}
            min={0}
            max={100}
            step={5}
            aria-label={`Blend between ${years[current]?.label} and ${compareLabel}`}
            onValueChange={([next]) => onBlendChange(next / 100)}
            className="min-w-24 flex-1"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">{compareLabel}</span>
        </div>
      )}
    </div>
  );
}
