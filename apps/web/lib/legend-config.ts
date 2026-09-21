// Class-value legends for raster themes.
//
// Vector layers don't need an entry here — their swatch color comes from
// layerColor(id) in lib/layer-style.ts, keyed off the layer's registry id.
// Photographic rasters (Orthomosaic, FCC) have no discrete class to key a
// swatch off, just band composition — their entries below are the generic
// R/G/B channel key, not a class list.

export interface LegendClass {
  value: number | string;
  label: string;
  color: string;
  /** Compact form, used when a long class list is laid out in columns. */
  shortLabel?: string;
}

export interface RasterLegend {
  /** Registry id this legend belongs to (lib/gis-registry.ts). */
  layerId: string;
  classes: LegendClass[];
  /** Present when a class's color scale is only approximately labeled (no exact numeric breakpoints were given). */
  note?: string;
  /**
   * Set when the classes form an ordered scale, in which case the legend
   * leads with them as a gradient bar (the client asked for gradient
   * legends). The value says which way round the class list runs, because
   * the delivered colour docs list some themes densest-first and some
   * sparsest-first, and the bar always has to draw low on the left.
   *
   * Left off for genuinely categorical palettes: Land Use's barren /
   * built-up / water and Vegetation Change's transition matrix have no order
   * to ramp along, and a photographic raster's R/G/B key is not a scale at
   * all. Drawing a bar for those would assert a progression that isn't in
   * the data.
   */
  ramp?: "low-to-high" | "high-to-low";
  /**
   * What to write under the two ends of the bar. Defaults to the lowest and
   * highest class's own label, which is usually what you want; set it where
   * the end of the scale is better named than its end class — e.g. Slope,
   * whose real range in degrees is known even though its intermediate
   * breakpoints were never supplied.
   */
  rampLabels?: [string, string];
  /**
   * Tick labels along the bar, one per class, evenly spaced. Only for a
   * theme whose classes really do divide the scale evenly — Aspect's eight
   * 45° compass sectors do; nothing else delivered so far does, and spacing
   * ticks evenly over unequal classes would misreport where the breaks are.
   */
  rampTicks?: string[];
}

// Visibly provisional — a plain 5-step grey ramp, distinct from any real
// thematic palette, so a provisional legend can't be mistaken for a real one.
const PROVISIONAL_RAMP = [
  "#D9D9D6",
  "#B5B5B0",
  "#8C8C86",
  "#5E5E58",
  "#33332F",
];

function provisionalLegend(layerId: string, classCount = 5): RasterLegend {
  return {
    layerId,
    // The placeholder palette is a light→dark grey ramp, so it is ordered by
    // construction even before the real classes arrive.
    ramp: "low-to-high",
    classes: Array.from({ length: classCount }, (_, i) => ({
      value: i + 1,
      label: `TODO — class ${i + 1} label`,
      color: PROVISIONAL_RAMP[i % PROVISIONAL_RAMP.length],
    })),
    note: "Provisional — real palette not yet supplied.",
  };
}

// Real class-color values, transcribed from the delivered COLOR.docx /
// LEGEND.docx files (Raster/COLOR.docx, Raster/Drone Data/Legend Color.docx,
// Raster/FCC/LEGEND.docx). Density classes (VDF/MDF/OF/SCRUB/NF) are the
// same five used across both a standalone density theme (not delivered) and
// Vegetation Change's 25-way transition matrix below.
const REAL_LEGENDS: Record<string, RasterLegend> = {
  // The client's colour doc labels this section "DENSITY classes" — it is the
  // Forest Cover theme's legend (the imagery's own palette matches it exactly).
  "forest-cover": {
    layerId: "forest-cover",
    // Densest first, as the client's colour doc lists them.
    ramp: "high-to-low",
    rampLabels: ["Non forest", "Very dense forest"],
    classes: [
      { value: 1, label: "Very Dense Forest", color: "#06660c" },
      { value: 2, label: "Moderately Dense Forest", color: "#05ba19" },
      { value: 3, label: "Open Forest", color: "#00ef67" },
      { value: 4, label: "Scrub", color: "#ffeb00" },
      { value: 5, label: "Non Forest", color: "#7f645b" },
    ],
    note: "The 1980 image is off-palette vs the other years in the delivered data — its colours won't match these swatches exactly.",
  },
  "green-cover": {
    layerId: "green-cover",
    ramp: "low-to-high",
    classes: [
      { value: 1, label: "Non-Forest", color: "#dedede" },
      { value: 2, label: "Forest", color: "#0a8d23" },
    ],
    note: "Non-Forest renders semi-transparent so the basemap shows through, per the source doc.",
  },
  "historical-land-use": {
    layerId: "historical-land-use",
    classes: [
      { value: 1, label: "Barren", color: "#816c65" },
      { value: 2, label: "Builtup", color: "#ff0025" },
      { value: 3, label: "Dense Vegetation", color: "#00570b" },
      { value: 4, label: "Scrub / Sparse Vegetation", color: "#96ef4d" },
      { value: 5, label: "Waterbody", color: "#1200ef" },
    ],
  },
  // Drone-sourced 2026 LULC — same palette as the satellite series above.
  "current-land-use": {
    layerId: "current-land-use",
    classes: [
      { value: 1, label: "Barren", color: "#816c65" },
      { value: 2, label: "Builtup", color: "#ff0025" },
      { value: 3, label: "Dense Vegetation", color: "#00570b" },
      { value: 4, label: "Scrub / Sparse Vegetation", color: "#96ef4d" },
      { value: 5, label: "Waterbody", color: "#1200ef" },
    ],
  },
  "forest-fragmentation": {
    layerId: "forest-fragmentation",
    // Patch through to core: most fragmented to least.
    ramp: "low-to-high",
    rampLabels: ["Most fragmented", "Least fragmented"],
    classes: [
      { value: "patch", label: "Patch", color: "#e07b34" },
      { value: "edge", label: "Edge", color: "#ffff00" },
      { value: "perforated", label: "Perforated", color: "#f0bf43" },
      { value: "core-small", label: "Core (<250 acres)", color: "#01bd00" },
      { value: "core-medium", label: "Core (250–500 acres)", color: "#009000" },
      { value: "core-large", label: "Core (>500 acres)", color: "#004e00" },
    ],
  },
  "vegetation-change": {
    layerId: "vegetation-change",
    // from-density → to-density transition matrix (VDF/MDF/OF/SCRUB/NF).
    classes: [
      {
        value: "VDF-VDF",
        label: "Very Dense Forest → Very Dense Forest",
        shortLabel: "VDF → VDF",
        color: "#006400",
      },
      {
        value: "VDF-MDF",
        label: "Very Dense Forest → Moderately Dense Forest",
        shortLabel: "VDF → MDF",
        color: "#00A651",
      },
      {
        value: "VDF-OF",
        label: "Very Dense Forest → Open Forest",
        shortLabel: "VDF → OF",
        color: "#a6c34a",
      },
      {
        value: "VDF-SCRUB",
        label: "Very Dense Forest → Scrub",
        shortLabel: "VDF → Scrub",
        color: "#FF8C00",
      },
      {
        value: "VDF-NF",
        label: "Very Dense Forest → Non Forest",
        shortLabel: "VDF → NF",
        color: "#FF1493",
      },
      {
        value: "MDF-VDF",
        label: "Moderately Dense Forest → Very Dense Forest",
        shortLabel: "MDF → VDF",
        color: "#800080",
      },
      {
        value: "MDF-MDF",
        label: "Moderately Dense Forest → Moderately Dense Forest",
        shortLabel: "MDF → MDF",
        color: "#6db27c",
      },
      {
        value: "MDF-OF",
        label: "Moderately Dense Forest → Open Forest",
        shortLabel: "MDF → OF",
        color: "#FFD700",
      },
      {
        value: "MDF-SCRUB",
        label: "Moderately Dense Forest → Scrub",
        shortLabel: "MDF → Scrub",
        color: "#ff6b63",
      },
      {
        value: "MDF-NF",
        label: "Moderately Dense Forest → Non Forest",
        shortLabel: "MDF → NF",
        color: "#bc3a4b",
      },
      {
        value: "OF-VDF",
        label: "Open Forest → Very Dense Forest",
        shortLabel: "OF → VDF",
        color: "#9C27B0",
      },
      {
        value: "OF-MDF",
        label: "Open Forest → Moderately Dense Forest",
        shortLabel: "OF → MDF",
        color: "#00ff00",
      },
      {
        value: "OF-OF",
        label: "Open Forest → Open Forest",
        shortLabel: "OF → OF",
        color: "#FFFF00",
      },
      {
        value: "OF-SCRUB",
        label: "Open Forest → Scrub",
        shortLabel: "OF → Scrub",
        color: "#FF6600",
      },
      {
        value: "OF-NF",
        label: "Open Forest → Non Forest",
        shortLabel: "OF → NF",
        color: "#ff0000",
      },
      {
        value: "SCRUB-VDF",
        label: "Scrub → Very Dense Forest",
        shortLabel: "Scrub → VDF",
        color: "#FFB6C1",
      },
      {
        value: "SCRUB-MDF",
        label: "Scrub → Moderately Dense Forest",
        shortLabel: "Scrub → MDF",
        color: "#FF69B4",
      },
      {
        value: "SCRUB-OF",
        label: "Scrub → Open Forest",
        shortLabel: "Scrub → OF",
        color: "#DAA520",
      },
      {
        value: "SCRUB-SCRUB",
        label: "Scrub → Scrub",
        shortLabel: "Scrub → Scrub",
        color: "#789410",
      },
      {
        value: "SCRUB-NF",
        label: "Scrub → Non Forest",
        shortLabel: "Scrub → NF",
        color: "#A52A2A",
      },
      {
        value: "NF-VDF",
        label: "Non Forest → Very Dense Forest",
        shortLabel: "NF → VDF",
        color: "#F48FB1",
      },
      {
        value: "NF-MDF",
        label: "Non Forest → Moderately Dense Forest",
        shortLabel: "NF → MDF",
        color: "#E91E63",
      },
      {
        value: "NF-OF",
        label: "Non Forest → Open Forest",
        shortLabel: "NF → OF",
        color: "#B8860B",
      },
      {
        value: "NF-SCRUB",
        label: "Non Forest → Scrub",
        shortLabel: "NF → Scrub",
        color: "#cd9661",
      },
      {
        value: "NF-NF",
        label: "Non Forest → Non Forest",
        shortLabel: "NF → NF",
        color: "#710000",
      },
    ],
    note: "VDF very dense · MDF moderately dense · OF open forest · NF non forest.",
  },
  chm: {
    layerId: "chm",
    ramp: "low-to-high",
    rampLabels: ["Low canopy", "High canopy"],
    classes: [
      { value: 1, label: "Low canopy height", color: "#28bceb" },
      { value: 2, label: "Medium-low canopy height", color: "#a4fc3c" },
      { value: 3, label: "Medium-high canopy height", color: "#fb7e21" },
      { value: 4, label: "High canopy height", color: "#7a0403" },
    ],
    note: "Gradient stops as given; exact height breakpoints (metres) weren't supplied.",
  },
  slope: {
    layerId: "slope",
    ramp: "low-to-high",
    // The range is the one number the delivered data does pin down, so the
    // ends of the bar carry it even though the breaks between are unknown.
    rampLabels: ["Flat · 0°", "Steep · 88°"],
    classes: [
      { value: 1, label: "Flattest", color: "#2c7bb6" },
      { value: 2, label: "Gentle", color: "#abd9e9" },
      { value: 3, label: "Moderate", color: "#ffffbf" },
      { value: 4, label: "Steep", color: "#fdae61" },
      { value: 5, label: "Steepest", color: "#d7191c" },
    ],
    note: "Range 0.001°–88.13° across the study area; exact intermediate breakpoints weren't supplied.",
  },
  aspect: {
    layerId: "aspect",
    // Azimuth is continuous and the palette runs along it, so this does get a
    // bar — and uniquely, its eight classes are eight equal 45° sectors, so
    // ticks can sit evenly under it and still be telling the truth about
    // where the breaks are.
    ramp: "low-to-high",
    rampTicks: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
    rampLabels: ["North · 0°", "North west · 360°"],
    classes: [
      { value: "N", label: "North (337.5°–22.5°)", color: "#30123b" },
      { value: "NE", label: "North East (22.5°–67.5°)", color: "#466be3" },
      { value: "E", label: "East (67.5°–112.5°)", color: "#28bceb" },
      { value: "SE", label: "South East (112.5°–157.5°)", color: "#32f298" },
      { value: "S", label: "South (157.5°–202.5°)", color: "#a4fc3c" },
      { value: "SW", label: "South West (202.5°–247.5°)", color: "#eecf3a" },
      { value: "W", label: "West (247.5°–292.5°)", color: "#fb7e21" },
      { value: "NW", label: "North West (292.5°–337.5°)", color: "#d02f05" },
    ],
  },
  // Not a class list — the generic R/G/B channel key for a photographic
  // raster (true-color composite: each channel is literally that band).
  orthomosaic: {
    layerId: "orthomosaic",
    classes: [
      { value: "R", label: "Red Band", color: "#FF0000" },
      { value: "G", label: "Green Band", color: "#00FF00" },
      { value: "B", label: "Blue Band", color: "#0000FF" },
    ],
  },
  // Same R/G/B channel key as Orthomosaic, but a *false*-color composite —
  // which sensor band is mapped to which channel varies by year (e.g. red
  // shows Near Infrared reflectance most years, but the literal Red band in
  // 1980); that per-year mapping isn't modeled anywhere in this app, so it
  // isn't shown here.
  // A scanned Survey of India sheet. It carries its own printed key inside
  // the image, so there is nothing to reproduce here — but an entry with a
  // note beats a bare theme name with silence under it.
  toposheet: {
    layerId: "toposheet",
    classes: [],
    note: "Scanned survey sheet — it carries its own printed legend in the image.",
  },
  "satellite-imagery": {
    layerId: "satellite-imagery",
    classes: [
      { value: "R", label: "Red Band", color: "#FF0000" },
      { value: "G", label: "Green Band", color: "#00FF00" },
      { value: "B", label: "Blue Band", color: "#0000FF" },
    ],
    note: "Band-to-channel mapping varies by year — see init.sql's FCC comment.",
  },
};

// Still-pending themes (no raster delivered) plus DSM/DTM, whose gradients
// were only given as named external palette references ("cpt-city
// DEM_screen", "cpt-city wiki-knutux") rather than literal hex stops.
const PROVISIONAL_IDS = [
  "forest-type",
  "ecological-degradation",
  "tof",
  "growing-stock",
  "tree-height",
  "habitat-suitability",
  "agb",
  "carbon-stock",
  "dsm",
  "dtm",
  "tree-density",
];

export const LEGEND_CONFIG: Record<string, RasterLegend> = {
  ...REAL_LEGENDS,
  ...Object.fromEntries(
    PROVISIONAL_IDS.map((id) => [id, provisionalLegend(id)]),
  ),
};

/** An ordered legend's classes, low first, with the two ends named. */
export interface RampScale {
  classes: LegendClass[];
  low: string;
  high: string;
  ticks?: string[];
}

/**
 * Resolves a legend's ramp into something drawable: the classes in scale
 * order whichever way round the delivered colour doc listed them, and the
 * captions for the two ends.
 *
 * Lives here rather than in the legend component because the PNG export
 * draws the same bar on a canvas — two renderers, one ordering, so the bar
 * cannot come out reversed in one of them.
 */
export function rampScale(legend: RasterLegend): RampScale | undefined {
  if (!legend.ramp || legend.classes.length === 0) return undefined;
  const classes =
    legend.ramp === "high-to-low" ? [...legend.classes].reverse() : legend.classes;
  const [low, high] = legend.rampLabels ?? [
    classes[0].label,
    classes[classes.length - 1].label,
  ];
  return { classes, low, high, ticks: legend.rampTicks };
}

/**
 * `layerId` is a raster theme's group key, straight off its `layer_groups`
 * row — the same id lib/sections.ts puts on a SectionDef. Renaming a group's
 * key in the seed therefore means renaming its entry here; renaming only its
 * *label* does not.
 */
export function legendFor(layerId: string): RasterLegend | undefined {
  return LEGEND_CONFIG[layerId];
}
