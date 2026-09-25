"use client";

import { useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LayerSwatch, type SwatchGeometryKind } from "@/components/LayerSwatch";
import { legendFor, rampScale, type LegendClass, type RampScale } from "@/lib/legend-config";
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
  /**
   * The year on screen, for the theme title. Omitted for a single-image
   * theme, whose one row is labelled with the theme's own name and would
   * otherwise read "Orthomosaic · Orthomosaic".
   */
  yearLabel?: string;
  /**
   * The static_overlays key for the image on screen, when the theme's
   * classes vary by image (Flood Depth) rather than being fixed per theme —
   * see legendFor's imageKey param.
   */
  imageKey?: string;
  isPhotographic?: boolean;
}

/** A switched-on static overlay — it has a colour but no loaded geometry here. */
export interface LegendOverlay {
  key: string;
  label: string;
  color: string;
  geometryKind: SwatchGeometryKind;
  /** The options group it was picked from, when names repeat across groups (two Matipalas). */
  group?: string;
  /** Set for a per-feature overlay (Forest Cover/Forest Type FSI) — see SectionItem.categories. */
  categories?: LegendClass[];
}

/**
 * The gradient bar: the theme's class colours laid end to end, leading its
 * legend the way the client's mockup shows.
 *
 * Only drawn for an ordered palette (see RasterLegend.ramp), and always with
 * low on the left whichever order the delivered colour doc listed the classes
 * in. What sits under it is whatever the data actually supports — evenly
 * spaced ticks for a theme whose classes are equal steps, otherwise just the
 * two ends named.
 *
 * Hard colour stops rather than a smooth blend: the imagery is classified, so
 * a fade would imply intermediate values the data does not contain, while the
 * bar still reads as one scale running low to high.
 */
function ScaleRamp({ scale }: { scale: RampScale }) {
  const { classes, low, high } = scale;

  const stops = classes
    .map((cls, i) => {
      const from = (i / classes.length) * 100;
      const to = ((i + 1) / classes.length) * 100;
      return `${cls.color} ${from}%, ${cls.color} ${to}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-1">
      <span
        className="h-3 w-full rounded-full ring-1 ring-foreground/15"
        style={{ backgroundImage: `linear-gradient(to right, ${stops})` }}
        aria-hidden
      />

      {scale.ticks && (
        <div className="flex" aria-hidden>
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="flex-1 text-center text-[9px] font-medium text-muted-foreground"
            >
              {tick}
            </span>
          ))}
        </div>
      )}

      {/* The ends named, which is the one thing a bar cannot say for itself.
          The class list below fills in the middle. */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] text-muted-foreground">{low}</span>
        <span className="min-w-0 truncate text-right text-[10px] text-muted-foreground">
          {high}
        </span>
      </div>
    </div>
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
  // A categorical overlay (Forest Cover/Forest Type FSI) draws per-feature,
  // so one swatch can't stand for it — it gets a class list instead, laid
  // out the same way a raster theme's below.
  const plainOverlays = overlays.filter((o) => !o.categories?.length);
  const categoricalOverlays = overlays.filter((o) => o.categories?.length);

  if (rows.length === 0 && overlays.length === 0 && rasterLayers.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No layers switched on yet — turn one on to see its legend.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(rows.length > 0 || plainOverlays.length > 0) && (
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
          {plainOverlays.map((overlay) => (
            <div key={overlay.key} className="flex items-center gap-2 text-sm">
              <LayerSwatch color={overlay.color} geometryKind={overlay.geometryKind} />
              <span>
                {overlay.label}
                {overlay.group && (
                  <span className="text-muted-foreground"> · {overlay.group}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {categoricalOverlays.map((overlay) => (
        <div key={overlay.key} className="flex flex-col gap-1.5">
          <span className="text-[13px] leading-tight font-semibold">{overlay.label}</span>
          <div className="flex flex-col gap-1">
            {overlay.categories!.map((cls) => (
              <div key={cls.value} className="flex items-center gap-1.5 text-xs">
                <LayerSwatch color={cls.color} geometryKind={overlay.geometryKind} />
                <span className="truncate" title={cls.label}>
                  {cls.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {rasterLayers.map((raster) => {
        const legend = legendFor(raster.id, raster.imageKey);
        const scale = legend && rampScale(legend);
        return (
          <div key={raster.id} className="flex flex-col gap-1.5">
            {/* Named and dated, as the mockup heads its legend: which year is
                on screen is half of what the colours mean. */}
            <span className="text-[13px] leading-tight font-semibold">
              {raster.name}
              {raster.yearLabel && (
                <span className="text-muted-foreground"> · {raster.yearLabel}</span>
              )}
            </span>
            {raster.isPhotographic ? (
              <span className="text-xs text-muted-foreground/70 italic">
                Photographic image — no class legend
              </span>
            ) : (
              legend && (
                <div className="flex flex-col gap-1.5">
                  {/* The bar leads, as in the mockup: it is the scale, and the
                      class list under it is the detail of where the steps
                      fall. Reversed from the old layout, where a thin strip
                      trailed the list it was meant to summarise. */}
                  {scale && <ScaleRamp scale={scale} />}

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
        <div className="min-h-0 flex-1 overflow-y-auto px-(--card-spacing) scrollbar-thin">
          <LegendContent layers={layers} overlays={overlays} rasterLayers={rasterLayers} />
        </div>
      )}
    </Card>
  );
}
