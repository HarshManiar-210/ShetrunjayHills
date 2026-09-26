import { API_URL } from "@/lib/layers-api";
import { legendFor, type LegendClass } from "@/lib/legend-config";

/**
 * Class areas for an overlay: the client's delivered figures where they
 * exist, otherwise measured by the API from the raster's pixels.
 *
 * Either way the server does not know what any class looks like. A measured
 * class arrives as a colour and a delivered one as its legend value; naming
 * and colouring both happens here, because the palettes belong to the legend
 * — which is also what keeps the chart's colours identical to the map's.
 */

export interface RasterClassStat {
  /** Upper-case "#RRGGBB", straight off the imagery. */
  color: string;
  pixels: number;
  area_sq_m: number;
  /** Share of the raster's opaque pixels, 0..1. */
  share: number;
}

export interface RasterStats {
  width: number;
  height: number;
  opaque_pixels: number;
  distinct_colors: number;
  /** Too many colours to be classes — an orthomosaic or FCC composite. */
  photographic: boolean;
  /** Ground area of the opaque pixels: the footprint, not the bounding box. */
  area_sq_m: number;
  classes: RasterClassStat[] | null;
}

/** One class of the client's official statistics. */
export interface DeliveredClassStat {
  /** The class's value in the theme's legend, or in a vector layer's categories. */
  value: string;
  /** The delivered name — shown only when no legend class matches `value`. */
  label: string;
  /** Heads a run of classes (Vegetation Change's Improvement / Degradation / Stable). */
  group?: string;
  area_sq_m: number;
  /** Share of the classified area, 0..1. */
  share: number;
}

/** The client's official figures for an overlay, from overlay_class_stats. */
export interface DeliveredStats {
  source: "delivered";
  /** The classes' total. */
  area_sq_m: number;
  classes: DeliveredClassStat[];
}

export type OverlayStats = (RasterStats & { source?: undefined }) | DeliveredStats;

export async function fetchOverlayStats(overlayKey: string): Promise<OverlayStats> {
  const res = await fetch(`${API_URL}/api/overlays/${overlayKey}/stats`);
  if (!res.ok) throw new Error(`failed to load statistics for ${overlayKey}`);
  return res.json();
}

/** A class's area and share, named and coloured against the theme's legend. */
export interface NamedClassStat {
  key: string;
  label: string;
  /** The legend's full name, where `label` is its compact form. */
  fullLabel?: string;
  /** The colour as it appears on the map — matched, not the legend's nominal value. */
  color: string;
  areaSqM: number;
  share: number;
  /** Heads a run of classes — see DeliveredClassStat.group. */
  group?: string;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function squaredDistance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/**
 * Beyond this a measured colour is not the legend's class, just the nearest
 * one. ~45 per channel — comfortably wider than the rounding between a
 * transcribed palette and the imagery, and far narrower than the gap between
 * any two classes in these themes.
 */
const MATCH_TOLERANCE = 3 * 45 ** 2;

/**
 * Names each measured colour against the theme's legend.
 *
 * Matching is nearest-colour rather than exact: the palettes were transcribed
 * from the client's colour documents and can sit a shade off the imagery.
 * These rasters are cleanly quantised (five colours for Forest Cover, LULC and
 * Fragmentation), so nearest-match is unambiguous. A colour with no class
 * within tolerance is kept and labelled by its hex rather than dropped —
 * silently discarding pixels would make the shares lie.
 */
export function nameClasses(
  themeId: string,
  measured: RasterClassStat[],
  imageKey?: string,
): NamedClassStat[] {
  const legend = legendFor(themeId, imageKey);
  const palette: { cls: LegendClass; rgb: [number, number, number] }[] = [];
  for (const cls of legend?.classes ?? []) {
    const rgb = parseHex(cls.color);
    if (rgb) palette.push({ cls, rgb });
  }

  const named = measured.map((stat): NamedClassStat => {
    const rgb = parseHex(stat.color);
    let best: { cls: LegendClass; distance: number } | null = null;
    if (rgb) {
      for (const entry of palette) {
        const distance = squaredDistance(rgb, entry.rgb);
        if (!best || distance < best.distance) best = { cls: entry.cls, distance };
      }
    }

    if (best && best.distance <= MATCH_TOLERANCE) {
      return {
        key: String(best.cls.value),
        label: best.cls.label,
        // The imagery's own colour, so the chart keys to what is on screen
        // even where the transcribed palette differs by a shade.
        color: stat.color,
        areaSqM: stat.area_sq_m,
        share: stat.share,
      };
    }

    return {
      key: stat.color,
      label: `Unclassified ${stat.color}`,
      color: stat.color,
      areaSqM: stat.area_sq_m,
      share: stat.share,
    };
  });

  // Two measured colours can land on one class (a palette with near-duplicate
  // entries, or a stray anti-aliased shade); fold them together so the table
  // has one row per class and the shares still sum correctly.
  const merged = new globalThis.Map<string, NamedClassStat>();
  for (const stat of named) {
    const existing = merged.get(stat.key);
    if (existing) {
      existing.areaSqM += stat.areaSqM;
      existing.share += stat.share;
    } else {
      merged.set(stat.key, { ...stat });
    }
  }

  return [...merged.values()].sort((a, b) => b.share - a.share);
}

/** For a delivered class whose value no legend entry carries. */
const UNMATCHED_COLOR = "#9CA3AF";

/**
 * Names delivered classes by their legend value. Kept in delivered order
 * rather than re-sorted by share: that order is the legend's, and Vegetation
 * Change's rows run in Improvement / Degradation / Stable runs that sorting
 * would scatter.
 *
 * `categories` is a classed vector layer's own class list, which stands in
 * for the legend a raster theme would have.
 */
export function nameDeliveredClasses(
  themeId: string,
  delivered: DeliveredClassStat[],
  imageKey?: string,
  categories?: LegendClass[],
): NamedClassStat[] {
  const classes = categories ?? legendFor(themeId, imageKey)?.classes ?? [];
  const byValue = new globalThis.Map(classes.map((cls) => [String(cls.value), cls]));

  return delivered.map((stat) => {
    const cls = byValue.get(stat.value);
    return {
      key: stat.value,
      // Vegetation Change's full names ("Moderately Dense Forest → Very
      // Dense Forest") don't fit the panel; its compact ones do.
      label: cls?.shortLabel ?? cls?.label ?? stat.label,
      fullLabel: cls?.label ?? stat.label,
      color: cls?.color ?? UNMATCHED_COLOR,
      areaSqM: stat.area_sq_m,
      share: stat.share,
      group: stat.group,
    };
  });
}

/** An overlay's statistics as named classes, whichever source they came from. */
export function classStatsFor(
  stats: OverlayStats,
  themeId: string,
  imageKey?: string,
  categories?: LegendClass[],
): NamedClassStat[] {
  if (stats.source === "delivered") {
    return nameDeliveredClasses(themeId, stats.classes, imageKey, categories);
  }
  if (stats.photographic) return [];
  return nameClasses(themeId, stats.classes ?? [], imageKey);
}
