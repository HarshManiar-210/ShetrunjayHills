"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LayerSwatch } from "@/components/LayerSwatch";
import { ClassDonut } from "@/components/ClassDonut";
import { countByLayer, STUDY_AREA_HA } from "@/lib/vector-stats";
import {
  fetchRasterStats,
  nameClasses,
  type NamedClassStat,
  type RasterStats,
} from "@/lib/raster-stats-api";
import type { LayerFeature } from "@/lib/layers-api";

/**
 * A raster theme currently on the map, and the specific image it is showing.
 * `imageKey` is the static_overlays key for the selected year, which is what
 * the statistics endpoint measures.
 */
export interface StatsRasterLayer {
  id: string;
  name: string;
  imageKey: string;
  year: number | null;
  years: number[];
}

/**
 * Above this many classes a donut stops being readable, so the panel shows the
 * stacked bar and table instead. Vegetation Change's transition matrix runs to
 * nineteen classes and lands here; Forest Cover, LULC and Fragmentation have
 * five each and get the ring the brief asked for.
 */
const MAX_DONUT_CLASSES = 6;

const COUNT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const toHectares = (sqMetres: number) => sqMetres / 10_000;

/** Part-to-whole as a bar, for themes with too many classes to ring. */
function StackedBar({ classes }: { classes: NamedClassStat[] }) {
  return (
    <div className="flex h-2 w-full gap-px overflow-hidden rounded-full" role="presentation">
      {classes.map((cls) => (
        <span
          key={cls.key}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${cls.share * 100}%`, backgroundColor: cls.color }}
          title={`${cls.label} — ${PERCENT.format(cls.share * 100)}%`}
        />
      ))}
    </div>
  );
}

/**
 * Doubles as the chart's legend and as its table view: identity is never
 * carried by slice colour alone.
 */
function ClassTable({ classes }: { classes: NamedClassStat[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      {classes.map((cls) => (
        <div key={cls.key} className="flex items-center gap-1.5 text-xs">
          <LayerSwatch color={cls.color} geometryKind="raster" />
          <span className="min-w-0 flex-1 truncate" title={cls.label}>
            {cls.label}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {COUNT.format(toHectares(cls.areaSqM))} ha
          </span>
          <span className="w-11 shrink-0 text-right tabular-nums">
            {PERCENT.format(cls.share * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function RasterStatsBlock({ layer }: { layer: StatsRasterLayer }) {
  const [stats, setStats] = useState<RasterStats | null>(null);
  const [failed, setFailed] = useState(false);

  // One fetch per image. Changing year remounts this block (StatsPanel keys
  // it on imageKey), so there is nothing to reset here — only the async
  // callbacks set state, and the guard drops a response that lost the race.
  useEffect(() => {
    let cancelled = false;
    fetchRasterStats(layer.imageKey)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [layer.imageKey]);

  const classes =
    stats && !stats.photographic
      ? nameClasses(layer.id, stats.classes ?? [], layer.imageKey)
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 text-xs leading-tight font-medium">{layer.name}</span>
        {layer.year != null && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {layer.year}
          </span>
        )}
      </div>

      {!stats && !failed && (
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" strokeWidth={2} />
          Measuring…
        </span>
      )}

      {failed && (
        <span className="text-[11px] text-muted-foreground/70 italic">
          Could not measure this layer.
        </span>
      )}

      {stats?.photographic && (
        <span className="text-[11px] text-muted-foreground/70 italic">
          Photographic image — no classes to summarise
        </span>
      )}

      {classes.length > 0 && (
        <>
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">Mapped area</span>
            <span className="font-medium tabular-nums">
              {COUNT.format(toHectares(stats!.area_sq_m))} ha
            </span>
          </div>

          {/* Ring above the table, not beside it. The panel is 18rem wide and
              the ring takes 104px of that; side by side, every class name
              elided to "Moder…". Stacked, the names read in full. */}
          {classes.length <= MAX_DONUT_CLASSES ? (
            <div className="flex flex-col items-center gap-1.5">
              <ClassDonut classes={classes} caption={`${layer.name} class shares`} />
              <ClassTable classes={classes} />
            </div>
          ) : (
            <>
              <StackedBar classes={classes} />
              <ClassTable classes={classes} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The Statistics tab: class areas per raster theme, measured from the imagery
 * itself by the API, plus feature counts for the vector layers on screen.
 *
 * These replace the synthetic filler this panel used to show. The numbers are
 * now real enough to check: Forest Cover's measured footprint comes to
 * 33.6 km² against the study area boundary's own surveyed 33.96 km².
 */
export function StatsPanel({
  rasterLayers,
  vectorFeatures,
  className,
}: {
  rasterLayers: StatsRasterLayer[];
  vectorFeatures: LayerFeature[];
  className?: string;
}) {
  const vectorCounts = countByLayer(vectorFeatures);

  if (rasterLayers.length === 0 && vectorCounts.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No statistics yet — switch on a layer to see its breakdown.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Study area</span>
        <span className="font-medium tabular-nums">{COUNT.format(STUDY_AREA_HA)} ha</span>
      </div>

      {/* Keyed on the image, so stepping the year remounts the block with
          clean state rather than an effect clearing the previous year's
          numbers after the fact. */}
      {rasterLayers.map((layer) => (
        <RasterStatsBlock key={`${layer.id}:${layer.imageKey}`} layer={layer} />
      ))}

      {vectorCounts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Features
          </span>
          {vectorCounts.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2 text-xs">
              <LayerSwatch color={layer.color} geometryKind={layer.geometryKind} />
              <span className="min-w-0 flex-1 leading-tight">{layer.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {COUNT.format(layer.count)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Statistics as its own panel, beside the Legend rather than behind a tab
 * with it — so the class shares and the legend that explains their colours can
 * be read at the same time, which the tab strip made impossible.
 */
export function StatsCard({
  rasterLayers,
  vectorFeatures,
  className,
}: {
  rasterLayers: StatsRasterLayer[];
  vectorFeatures: LayerFeature[];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className={cn("shadow-e3", className)} size="sm" data-tour="info-panel">
      <div className="flex shrink-0 items-center gap-2 px-(--card-spacing)">
        <BarChart3 className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <p className="min-w-0 flex-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Statistics
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={collapsed ? "Expand statistics" : "Collapse statistics"}
          onClick={() => setCollapsed((c) => !c)}
        >
          <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
        </Button>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-(--card-spacing) scrollbar-thin">
          <StatsPanel rasterLayers={rasterLayers} vectorFeatures={vectorFeatures} />
        </div>
      )}
    </Card>
  );
}
