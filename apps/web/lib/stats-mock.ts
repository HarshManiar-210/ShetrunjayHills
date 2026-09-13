// Illustrative zonal statistics for the Statistics panel.
//
// No zonal-statistics data has been delivered, so the class-share numbers
// below are SYNTHETIC FILLER: deterministic per (layer, year) so switching the
// year visibly changes the panel, but not a measurement of anything. Do not
// "fix" them to look more realistic — replace this module once real zonal
// stats arrive.
//
// Per current request, the per-class breakdown is switched off for every
// raster theme for now (see NO_STATS below) — this module stays in place,
// ready to re-enable per theme once real stats are delivered.
//
// Two things here are NOT filler:
//   - STUDY_AREA_HA, the surveyed hill area from PalitanaStudyArea.geojson.
//   - Vector feature counts, which the panel derives from the actually loaded
//     GeoJSON rather than from this module.

import { legendFor, type LegendClass } from "@/lib/legend-config";

/** Real surveyed area of the Shetrunjay study area, in hectares. */
export const STUDY_AREA_HA = 3396;

export interface ClassStat {
  value: LegendClass["value"];
  label: string;
  color: string;
  areaHa: number;
  percent: number;
}

export interface TrendPoint {
  year: number;
  percent: number;
}

export interface RasterLayerStats {
  layerId: string;
  name: string;
  year: number | null;
  classes: ClassStat[];
  /** Present for multi-year themes — one tracked class's share over time. */
  trend?: { className: string; color: string; points: TrendPoint[] };
}

/** A raster section switched on, with the years it offers and the one showing. */
export interface StatsRasterLayer {
  id: string;
  name: string;
  year: number | null;
  years: number[];
  isPhotographic?: boolean;
}

// Which legend class a theme's trend line tracks — the class the theme is
// actually "about", rather than whichever happens to be declared first.
const TREND_CLASS_INDEX: Record<string, number> = {
  "green-cover": 1, // Forest (class 0 is Non-Forest)
};

// No real zonal-stats data has been delivered for any raster theme yet, so
// the Stats panel's per-class breakdown is switched off across the board for
// now — sidebar/legend/map are unaffected. Add a theme's id here as it's
// wired up; when real data finally arrives, drop this gate rather than
// deleting it theme-by-theme.
const NO_STATS = new Set(["forest-cover", "vegetation-change", "lulc"]);

// FNV-1a — any stable string→number hash works; this one is short and has no
// dependencies. Used only to make the filler reproducible, never for security.
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unitRandom(seed: string): number {
  return hash(seed) / 4294967296;
}

// Weights are floored at 0.25 so no class collapses to a rounding-zero sliver
// that would render as an invisible bar segment.
function classShares(layerId: string, year: number | null, count: number): number[] {
  const weights = Array.from({ length: count }, (_, i) =>
    0.25 + unitRandom(`${layerId}|${year ?? "single"}|${i}`),
  );
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => (w / total) * 100);
}

/**
 * Per-class breakdown for one raster theme, for the year currently selected.
 * Returns null for layers with no class legend — photographic rasters have no
 * discrete classes to count.
 */
export function rasterStats(layer: StatsRasterLayer): RasterLayerStats | null {
  if (layer.isPhotographic || NO_STATS.has(layer.id)) return null;
  const legend = legendFor(layer.id);
  if (!legend || legend.classes.length === 0) return null;

  const shares = classShares(layer.id, layer.year, legend.classes.length);
  const classes: ClassStat[] = legend.classes.map((cls, i) => ({
    value: cls.value,
    label: cls.shortLabel ?? cls.label,
    color: cls.color,
    percent: shares[i],
    areaHa: (shares[i] / 100) * STUDY_AREA_HA,
  }));

  const trackedIndex = TREND_CLASS_INDEX[layer.id] ?? 0;
  const tracked = legend.classes[trackedIndex];
  const trend =
    layer.years.length > 1 && tracked
      ? {
          className: tracked.shortLabel ?? tracked.label,
          color: tracked.color,
          points: layer.years.map((y) => ({
            year: y,
            percent: classShares(layer.id, y, legend.classes.length)[trackedIndex],
          })),
        }
      : undefined;

  return { layerId: layer.id, name: layer.name, year: layer.year, classes, trend };
}
