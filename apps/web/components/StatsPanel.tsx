"use client";

import { Fragment, useEffect, useState } from "react";
import { BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LayerSwatch } from "@/components/LayerSwatch";
import { ClassDonut } from "@/components/ClassDonut";
import { countByLayer, STUDY_AREA_HA } from "@/lib/vector-stats";
import {
  classStatsFor,
  fetchOverlayStats,
  type NamedClassStat,
  type OverlayStats,
} from "@/lib/raster-stats-api";
import type { LayerFeature } from "@/lib/layers-api";
import type { LegendClass } from "@/lib/legend-config";

/**
 * A raster theme currently on the map, and the specific image it is showing —
 * or a classed vector overlay the client delivered statistics for (the FSI
 * layers). `imageKey` is the static_overlays key for the selected year, which
 * is what the statistics endpoint answers for.
 */
export interface StatsRasterLayer {
  id: string;
  name: string;
  imageKey: string;
  year: number | null;
  /** What the year picker calls this image — a bare year, or a "1980 → 1989" range. */
  yearLabel?: string;
  years: number[];
  /** A vector overlay's own class list, standing in for a raster legend. */
  categories?: LegendClass[];
  /** The second image while the year bar is comparing two years. */
  compare?: { imageKey: string; year: number; label: string };
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
      {classes.map((cls, i) => (
        <Fragment key={cls.key}>
          {/* Vegetation Change's Improvement / Degradation / Stable runs. */}
          {cls.group && cls.group !== classes[i - 1]?.group && (
            <span className="pt-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {cls.group}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs">
            <LayerSwatch color={cls.color} geometryKind="raster" />
            <span className="min-w-0 flex-1 truncate" title={cls.fullLabel ?? cls.label}>
              {cls.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {COUNT.format(toHectares(cls.areaSqM))} ha
            </span>
            <span className="w-11 shrink-0 text-right tabular-nums">
              {PERCENT.format(cls.share * 100)}%
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * One image's statistics. Changing image remounts the block that asked
 * (StatsPanel keys blocks on their images), so there is nothing to reset here
 * — only the async callbacks set state, and the guard drops a response that
 * lost the race.
 */
function useOverlayStats(imageKey: string) {
  const [stats, setStats] = useState<OverlayStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOverlayStats(imageKey)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [imageKey]);

  return { stats, failed };
}

function BlockHeading({ name, detail }: { name: string; detail?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 text-xs leading-tight font-medium">{name}</span>
      {detail && (
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{detail}</span>
      )}
    </div>
  );
}

function StatsLoading() {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Loader2 className="size-3 animate-spin" strokeWidth={2} />
      Loading…
    </span>
  );
}

function StatsFailed() {
  return (
    <span className="text-[11px] text-muted-foreground/70 italic">
      Could not measure this layer.
    </span>
  );
}

const sourceLabel = (stats: OverlayStats) =>
  stats.source === "delivered" ? "Official figures" : "Measured from imagery";

function RasterStatsBlock({ layer }: { layer: StatsRasterLayer }) {
  const { stats, failed } = useOverlayStats(layer.imageKey);

  const classes = stats
    ? classStatsFor(stats, layer.id, layer.imageKey, layer.categories)
    : [];

  return (
    <div className="flex flex-col gap-1.5">
      <BlockHeading
        name={layer.name}
        detail={layer.yearLabel ?? (layer.year != null ? String(layer.year) : undefined)}
      />

      {!stats && !failed && <StatsLoading />}
      {failed && <StatsFailed />}

      {classes.length > 0 && (
        <>
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">Mapped area</span>
            <span className="font-medium tabular-nums">
              {COUNT.format(toHectares(stats!.area_sq_m))} ha
            </span>
          </div>
          <span className="-mt-1 text-[10px] text-muted-foreground/70">
            {sourceLabel(stats!)}
          </span>

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

/** A class's figures in each of the two compared years; absent where it isn't mapped. */
interface ComparedClass {
  key: string;
  label: string;
  fullLabel?: string;
  color: string;
  group?: string;
  before?: NamedClassStat;
  after?: NamedClassStat;
}

/**
 * Lines the two years' classes up by class: the earlier year's order first,
 * then any class only the later year has — so delivered legend order and
 * Vegetation Change's group runs survive.
 */
function compareClasses(before: NamedClassStat[], after: NamedClassStat[]): ComparedClass[] {
  const rows = new globalThis.Map<string, ComparedClass>();
  for (const [side, classes] of [
    ["before", before],
    ["after", after],
  ] as const) {
    for (const cls of classes) {
      const row = rows.get(cls.key) ?? {
        key: cls.key,
        label: cls.label,
        fullLabel: cls.fullLabel,
        color: cls.color,
        group: cls.group,
      };
      row[side] = cls;
      rows.set(cls.key, row);
    }
  }
  return [...rows.values()];
}

const SIGNED = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

const shareText = (cls?: NamedClassStat) =>
  cls ? `${PERCENT.format(cls.share * 100)}%` : "not mapped";

/**
 * Both years' hectares per class and the change between them — the numbers
 * the two charts above it can only show as proportions. Shares are in each
 * row's tooltip.
 */
function CompareTable({
  rows,
  before,
  after,
}: {
  rows: ComparedClass[];
  before: string;
  after: string;
}) {
  const cell = "w-12 shrink-0 text-right tabular-nums";
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="min-w-0 flex-1">Class · ha</span>
        <span className={cell}>{before}</span>
        <span className={cell}>{after}</span>
        <span className={cell}>Change</span>
      </div>
      {rows.map((row, i) => {
        const a = row.before ? toHectares(row.before.areaSqM) : 0;
        const b = row.after ? toHectares(row.after.areaSqM) : 0;
        return (
          <Fragment key={row.key}>
            {row.group && row.group !== rows[i - 1]?.group && (
              <span className="pt-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {row.group}
              </span>
            )}
            <div
              className="flex items-center gap-1.5 text-xs"
              title={`${row.fullLabel ?? row.label}: ${before} ${shareText(row.before)} → ${after} ${shareText(row.after)}`}
            >
              <LayerSwatch color={row.color} geometryKind="raster" />
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <span className={cn(cell, "text-muted-foreground")}>
                {row.before ? COUNT.format(a) : "–"}
              </span>
              <span className={cn(cell, "text-muted-foreground")}>
                {row.after ? COUNT.format(b) : "–"}
              </span>
              <span className={cn(cell, "font-medium")}>{SIGNED.format(b - a)}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * The year bar's compare mode, in numbers: the two years' class shares as two
 * charts side by side — rings, or bars for a theme with too many classes to
 * ring — over one table of both years' areas and the change between them.
 * Earlier year on the left whichever of the two is the base, so the change
 * always reads forwards in time.
 */
function CompareStatsBlock({
  layer,
  compare,
}: {
  layer: StatsRasterLayer;
  compare: NonNullable<StatsRasterLayer["compare"]>;
}) {
  const base = useOverlayStats(layer.imageKey);
  const other = useOverlayStats(compare.imageKey);

  const sides = [
    {
      imageKey: layer.imageKey,
      year: layer.year ?? 0,
      label: layer.yearLabel ?? String(layer.year ?? ""),
      ...base,
    },
    { imageKey: compare.imageKey, year: compare.year, label: compare.label, ...other },
  ]
    .sort((a, b) => a.year - b.year)
    .map((side) => ({
      ...side,
      classes: side.stats
        ? classStatsFor(side.stats, layer.id, side.imageKey, layer.categories)
        : [],
    }));
  const [before, after] = sides;

  const loading = sides.some((side) => !side.stats && !side.failed);
  const failed = sides.some((side) => side.failed);
  const rows = compareClasses(before.classes, after.classes);
  const ring = Math.max(before.classes.length, after.classes.length) <= MAX_DONUT_CLASSES;

  return (
    <div className="flex flex-col gap-1.5">
      <BlockHeading name={layer.name} detail={`${before.label} vs ${after.label}`} />

      {loading && <StatsLoading />}
      {!loading && failed && <StatsFailed />}

      {!loading && !failed && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {sides.map((side) => (
              <div key={side.imageKey} className="flex min-w-0 flex-col items-center gap-1">
                <span className="text-[11px] font-medium tabular-nums">{side.label}</span>
                {ring ? (
                  <ClassDonut
                    classes={side.classes}
                    caption={`${layer.name} ${side.label} class shares`}
                  />
                ) : (
                  <StackedBar classes={side.classes} />
                )}
                <span className="text-[11px] tabular-nums">
                  {COUNT.format(toHectares(side.stats!.area_sq_m))} ha
                </span>
                <span className="-mt-1 text-[10px] text-muted-foreground/70">
                  {sourceLabel(side.stats!)}
                </span>
              </div>
            ))}
          </div>
          <CompareTable rows={rows} before={before.label} after={after.label} />
        </>
      )}
    </div>
  );
}

/**
 * The Statistics tab: class areas per raster theme — the client's official
 * figures where they were delivered, otherwise measured from the imagery
 * itself by the API — plus feature counts for the vector layers on screen.
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
    return null;
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
      {rasterLayers.map((layer) =>
        layer.compare ? (
          <CompareStatsBlock
            key={`${layer.id}:${layer.imageKey}:${layer.compare.imageKey}`}
            layer={layer}
            compare={layer.compare}
          />
        ) : (
          <RasterStatsBlock key={`${layer.id}:${layer.imageKey}`} layer={layer} />
        ),
      )}

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
