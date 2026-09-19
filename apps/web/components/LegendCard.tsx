"use client";

import { useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LayerSwatch, type SwatchGeometryKind } from "@/components/LayerSwatch";
import { legendFor, type RasterLegend } from "@/lib/legend-config";
import { geometryKindOf } from "@/lib/sections";
import type { LayerFeature } from "@/lib/layers-api";

// Many features can share one layer, so the legend lists one row per layer,
// not per feature.
function uniqueLayers(features: LayerFeature[]): LayerFeature[] {
  const seen = new globalThis.Map<number, LayerFeature>();
  for (const feature of features) {
    if (!seen.has(feature.properties.id)) seen.set(feature.properties.id, feature);
  }
  return [...seen.values()];
}

// Above this many classes a single column gets too tall for the card.
const TWO_COLUMN_THRESHOLD = 8;

function isLong(legend: { classes: unknown[] }): boolean {
  return legend.classes.length > TWO_COLUMN_THRESHOLD;
}

export interface LegendRasterLayer {
  id: string;
  name: string;
  isPhotographic?: boolean;
}

/** A switched-on static overlay — it has a colour but no loaded geometry here. */
export interface LegendOverlay {
  key: string;
  label: string;
  color: string;
  geometryKind: SwatchGeometryKind;
}

/**
 * The continuous ramp the client asked for: the theme's class colours laid
 * end to end beneath the class list.
 *
 * Only drawn for an ordered palette (see RasterLegend.ramp). Hard colour stops
 * rather than a smooth blend — the imagery is classified, so a smooth fade
 * would imply intermediate values the data does not contain, while the strip
 * still reads as one scale running low to high.
 */
function ClassRamp({ legend }: { legend: RasterLegend }) {
  const stops = legend.classes
    .map((cls, i) => {
      const from = (i / legend.classes.length) * 100;
      const to = ((i + 1) / legend.classes.length) * 100;
      return `${cls.color} ${from}%, ${cls.color} ${to}%`;
    })
    .join(", ");

  // No end captions: the class list sits directly above in the same order, so
  // naming the ends again would say the same thing twice. The strip's job is
  // to show the scale as one continuous thing.
  return (
    <span
      className="mt-1 h-2 w-full rounded-full ring-1 ring-foreground/10"
      style={{ backgroundImage: `linear-gradient(to right, ${stops})` }}
      aria-hidden
    />
  );
}

/**
 * Legend body — swatch rows for the switched-on vector layers and overlays,
 * then a class list per switched-on raster theme, with a gradient ramp beneath
 * any theme whose classes are ordered.
 */
export function LegendContent({
  layers,
  overlays = [],
  rasterLayers = [],
  className,
}: {
  layers: LayerFeature[];
  overlays?: LegendOverlay[];
  rasterLayers?: LegendRasterLayer[];
  className?: string;
}) {
  const rows = uniqueLayers(layers);

  if (rows.length === 0 && overlays.length === 0 && rasterLayers.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No layers switched on yet — turn one on to see its legend.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(rows.length > 0 || overlays.length > 0) && (
        <div className="flex flex-col gap-1.5">
          {rows.map((feature) => (
            <div key={feature.properties.id} className="flex items-center gap-2 text-sm">
              <LayerSwatch
                color={feature.properties.color}
                geometryKind={geometryKindOf(feature.geometry.type)}
              />
              <span>{feature.properties.name}</span>
            </div>
          ))}
          {overlays.map((overlay) => (
            <div key={overlay.key} className="flex items-center gap-2 text-sm">
              <LayerSwatch color={overlay.color} geometryKind={overlay.geometryKind} />
              <span>{overlay.label}</span>
            </div>
          ))}
        </div>
      )}

      {rasterLayers.map((raster) => {
        const legend = legendFor(raster.id);
        return (
          <div key={raster.id} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{raster.name}</span>
            {raster.isPhotographic ? (
              <span className="text-xs text-muted-foreground/70 italic">
                Photographic image — no class legend
              </span>
            ) : (
              legend && (
                <div className="flex flex-col gap-1">
                  {/* Long class lists go two-up with their compact labels, so
                      the legend still fits without scrolling. */}
                  <div
                    className={cn(
                      "gap-x-2 gap-y-1",
                      isLong(legend) ? "grid grid-cols-2" : "flex flex-col",
                    )}
                  >
                    {legend.classes.map((cls) => (
                      <div key={cls.value} className="flex items-center gap-1.5 text-xs">
                        {/* A raster class is a solid block, per the brief —
                            the same shape LayerSwatch gives a filled polygon,
                            and deliberately not the dot a point layer gets. */}
                        <LayerSwatch color={cls.color} geometryKind="raster" />
                        <span className="truncate" title={cls.label}>
                          {isLong(legend) ? (cls.shortLabel ?? cls.label) : cls.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {legend.ramp && <ClassRamp legend={legend} />}
                  {legend.note && (
                    <span className="text-[10px] text-muted-foreground/70 italic">{legend.note}</span>
                  )}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The Legend as its own panel.
 *
 * It used to share a card with Statistics behind a tab strip, which meant only
 * one could be read at a time — and the legend is what makes the map legible,
 * so it should not be something you switch away from to see a number. They are
 * now two independent cards, each collapsible on its own.
 */
export function LegendCard({
  layers,
  overlays,
  rasterLayers,
  className,
}: {
  layers: LayerFeature[];
  overlays?: LegendOverlay[];
  rasterLayers?: LegendRasterLayer[];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className={cn("shadow-e3", className)} size="sm" data-tour="legend">
      <div className="flex shrink-0 items-center gap-2 px-(--card-spacing)">
        <ListTree className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <p className="min-w-0 flex-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Legend
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
          onClick={() => setCollapsed((c) => !c)}
        >
          <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
        </Button>
      </div>

      {!collapsed && (
        <div className="min-h-0 overflow-y-auto px-(--card-spacing) scrollbar-thin">
          <LegendContent layers={layers} overlays={overlays} rasterLayers={rasterLayers} />
        </div>
      )}
    </Card>
  );
}
