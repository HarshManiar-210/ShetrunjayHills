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
  /**
   * What one step is called, singular: "year" for a time series, "depth" for
   * Flood Depth's depth levels. From layer_groups.step_noun, so the bar's
   * wording follows the data rather than assuming every series is years.
   */
  stepNoun: string;
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
  const step = theme.stepNoun;
  const Step = `${step[0].toUpperCase()}${step.slice(1)}`;
  const compareLabel = years.find((y) => y.year === compareYear)?.label;
  // In compare mode the bar reads left to right as a span: the compared year
  // is the start ("From"), the bar's own year the end ("To"). The timeline is
  // only a readout then — both ends are set from the two dropdowns.
  const compareIndex = years.findIndex((y) => y.year === compareYear);
  const spanFrom = comparing && compareIndex >= 0 ? Math.min(compareIndex, current) : 0;
  const spanTo = comparing && compareIndex >= 0 ? Math.max(compareIndex, current) : current;

  return (
    <div
      data-tour="year-bar"
      className={cn(
        // Fills the band its container leaves free rather than capping at a
        // fixed width, so the track has room to breathe instead of crowding
        // into the middle of the map. The cap only bites on a very wide
        // screen, where a bar spanning everything is more travel than the
        // control is worth.
        "flex w-full max-w-[72rem] flex-col rounded-2xl bg-card/95 px-3 py-1.5 shadow-e3 ring-1 ring-foreground/10 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          size="icon-sm"
          className="size-7 shrink-0 rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
          // Playing moves the bar's year, which while comparing is the "To"
          // end of the span — so it waits until comparing stops.
          disabled={comparing}
          aria-label={playing ? "Pause the timeline" : `Play through the ${step}s`}
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

        {/* The selected year leads, as in the reference: it is the one fact
            the bar exists to report, so it is read before the layer name. */}
        <div className="min-w-0 shrink-0">
          <p className="text-[13px] leading-tight font-semibold tabular-nums">
            {comparing ? `${compareLabel} → ${years[current]?.label}` : years[current]?.label}
          </p>
          {themes.length > 1 ? (
            <Select value={theme.id} onValueChange={onFocusChange}>
              <SelectTrigger
                // Widens where the bar's band has room for it. At w-44 a
                // name like "Historical Land Use (Satellite: 1978–2025)"
                // lost its second half, which is the part that says which
                // of the two land-use themes this is.
                className="h-auto w-44 border-0 bg-transparent p-0 text-[10px] text-muted-foreground shadow-none focus-visible:ring-0 xl:w-56"
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
            <p className="truncate text-[10px] leading-tight text-muted-foreground" title={theme.label}>
              {theme.label} · {years.length} {step}s
            </p>
          )}
        </div>

        {/* The timeline as a track with a node per year.
            Nodes are evenly spaced rather than placed proportionally: the
            series is unevenly sampled (1980, 1989, 1998, 2008, 2018, 2025,
            2026) and a true time axis crushes the recent years into each
            other, which are the ones most often compared. */}
        <div className="relative flex min-w-0 flex-1 items-start justify-between gap-1 px-2">
          {/* One rule behind every node, inset by half a node so it starts and
              ends at the first and last centres rather than overshooting. */}
          <span
            aria-hidden
            className="absolute top-[7px] right-2 left-2 h-px bg-border"
          />
          <span
            aria-hidden
            className="absolute top-[7px] h-px bg-brand transition-[left,width]"
            style={{
              left:
                years.length > 1 ? `calc(0.5rem + (100% - 1rem) * ${spanFrom / (years.length - 1)})` : "0.5rem",
              width:
                years.length > 1
                  ? `calc((100% - 1rem) * ${(spanTo - spanFrom) / (years.length - 1)})`
                  : "0px",
            }}
          />

          {years.map((y, i) => {
            // Both compared years are selected points; otherwise just the one.
            const active = i === current || (comparing && y.year === compareYear);
            const within = i > spanFrom && i < spanTo;
            const past = comparing ? within : i < current;
            return (
              <button
                key={y.year}
                type="button"
                aria-current={active}
                title={comparing ? `${y.label} — pick ${step}s from the dropdowns while comparing` : y.label}
                onClick={() => onYearChange(y.year)}
                // Comparing, the two ends come from the dropdowns; a click on
                // the line would silently move one of them.
                disabled={comparing}
                className="group relative flex shrink-0 flex-col items-center gap-1 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "size-[15px] rounded-full border-2 bg-card transition-colors",
                    active && "border-brand bg-brand",
                    !active && past && "border-brand/60",
                    !active && !past && "border-border",
                    !active && !past && !comparing && "group-hover:border-brand/60",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] leading-none tabular-nums transition-colors",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {y.label}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant={comparing ? "default" : "outline"}
          size="sm"
          className="h-7 shrink-0 gap-1.5"
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
          {comparing ? "Stop comparing" : `Compare two ${step}s`}
        </Button>
      </div>

      {comparing && (
        <div className="mt-2 flex items-center gap-3 border-t border-border/60 pt-2">
          {/* From and To, each unable to pick the year the other holds. The
              slider between them fades left to right from the one to the
              other: blend 0 shows only the bar's year (To), hence 1 - blend. */}
          <YearSelect
            label={`${Step} to compare from`}
            caption="From"
            years={years}
            value={compareYear}
            taken={years[current]?.year}
            onChange={onCompareYearChange}
          />
          <Slider
            value={[Math.round((1 - blend) * 100)]}
            min={0}
            max={100}
            step={5}
            aria-label={`Blend from ${compareLabel} to ${years[current]?.label}`}
            onValueChange={([next]) => onBlendChange(1 - next / 100)}
            className="min-w-24 flex-1"
          />
          <YearSelect
            label={`${Step} to compare to`}
            caption="To"
            years={years}
            value={years[current]?.year ?? null}
            taken={compareYear}
            onChange={onYearChange}
          />
        </div>
      )}
    </div>
  );
}

/** One end of the compared span: a dropdown of the theme's years. */
function YearSelect({
  label,
  caption,
  years,
  value,
  taken,
  onChange,
}: {
  label: string;
  caption: string;
  years: RasterYear[];
  value: number | null;
  /** The year the other end holds — shown, but not pickable. */
  taken: number | null | undefined;
  onChange: (year: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">{caption}</span>
      <Select value={value === null ? undefined : String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-7 w-28 text-xs" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.year} value={String(y.year)} disabled={y.year === taken}>
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
