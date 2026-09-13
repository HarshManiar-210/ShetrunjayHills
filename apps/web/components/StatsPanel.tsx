"use client";

import { cn } from "@/lib/utils";
import { LayerSwatch, type SwatchGeometryKind } from "@/components/LayerSwatch";
import { rasterStats, STUDY_AREA_HA, type RasterLayerStats, type StatsRasterLayer } from "@/lib/stats-mock";
import { geometryKindOf } from "@/lib/sections";
import type { LayerFeature } from "@/lib/layers-api";

export type { StatsRasterLayer };

const COUNT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// One row per vector layer, counted off the features actually loaded into the
// map — unlike the raster class shares, these counts are real.
interface VectorLayerCount {
  id: number;
  name: string;
  count: number;
  color: string;
  geometryKind: SwatchGeometryKind;
}

function countByLayer(features: LayerFeature[]): VectorLayerCount[] {
  const counts = new globalThis.Map<number, VectorLayerCount>();
  for (const feature of features) {
    const { id, name, color } = feature.properties;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { id, name, color, count: 1, geometryKind: geometryKindOf(feature.geometry.type) });
  }
  return [...counts.values()];
}

function StackedBar({ classes }: { classes: RasterLayerStats["classes"] }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" role="presentation">
      {classes.map((cls) => (
        <span
          key={String(cls.value)}
          className="h-full"
          style={{ width: `${cls.percent}%`, backgroundColor: cls.color }}
          title={`${cls.label} — ${PERCENT.format(cls.percent)}%`}
        />
      ))}
    </div>
  );
}

// Year-over-year share of the one class the theme tracks. Bars scale against
// the largest point rather than 100%, so a theme whose tracked class never
// exceeds ~20% still shows a readable shape.
function TrendBars({
  trend,
  selectedYear,
}: {
  trend: NonNullable<RasterLayerStats["trend"]>;
  selectedYear: number | null;
}) {
  const peak = Math.max(...trend.points.map((p) => p.percent));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{trend.className} share by year</span>
      <div className="flex h-12 items-end gap-1">
        {trend.points.map((point) => {
          const current = point.year === selectedYear;
          return (
            <div key={point.year} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <span
                className={cn("w-full rounded-sm transition-opacity", !current && "opacity-45")}
                style={{
                  height: `${Math.max(4, (point.percent / peak) * 34)}px`,
                  backgroundColor: trend.color,
                }}
                title={`${point.year} — ${PERCENT.format(point.percent)}%`}
              />
              <span
                className={cn(
                  "text-[9px] tabular-nums",
                  current ? "font-medium text-foreground" : "text-muted-foreground/70",
                )}
              >
                {String(point.year).slice(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RasterStatsBlock({ stats }: { stats: RasterLayerStats }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium">{stats.name}</span>
        {stats.year != null && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {stats.year}
          </span>
        )}
      </div>

      <StackedBar classes={stats.classes} />

      <div className="flex flex-col gap-0.5">
        {stats.classes.map((cls) => (
          <div key={String(cls.value)} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: cls.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate" title={cls.label}>
              {cls.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {COUNT.format(cls.areaHa)} ha
            </span>
            <span className="w-11 shrink-0 text-right tabular-nums">
              {PERCENT.format(cls.percent)}%
            </span>
          </div>
        ))}
      </div>

      {stats.trend && <TrendBars trend={stats.trend} selectedYear={stats.year} />}
    </div>
  );
}

export function StatsPanel({
  rasterLayers,
  vectorFeatures,
  className,
}: {
  rasterLayers: StatsRasterLayer[];
  vectorFeatures: LayerFeature[];
  className?: string;
}) {
  const rasterBlocks = rasterLayers
    .map((layer) => rasterStats(layer))
    .filter((s): s is RasterLayerStats => s !== null);
  const vectorCounts = countByLayer(vectorFeatures);
  // Photographic rasters are on the map but have no classes to count — say so
  // rather than silently omitting them.
  const photographic = rasterLayers.filter((layer) => layer.isPhotographic);

  if (rasterBlocks.length === 0 && vectorCounts.length === 0 && photographic.length === 0) {
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

      {rasterBlocks.map((stats) => (
        <RasterStatsBlock key={stats.layerId} stats={stats} />
      ))}

      {photographic.map((layer) => (
        <div key={layer.id} className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">{layer.name}</span>
          <span className="text-[11px] text-muted-foreground/70 italic">
            Photographic image — no classes to summarise
          </span>
        </div>
      ))}

      {vectorCounts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Features
          </span>
          {vectorCounts.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2 text-xs">
              <LayerSwatch color={layer.color} geometryKind={layer.geometryKind} />
              <span className="min-w-0 flex-1 truncate">{layer.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {COUNT.format(layer.count)}
              </span>
            </div>
          ))}
        </div>
      )}

      {rasterBlocks.length > 0 && (
        <p className="border-t border-border pt-2 text-[10px] text-muted-foreground/70 italic">
          Class shares are illustrative placeholders — no zonal statistics have been
          delivered yet. Feature counts are real.
        </p>
      )}
    </div>
  );
}
