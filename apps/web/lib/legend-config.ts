// Class-value legends for raster themes.
//
// Vector layers don't need an entry here — their swatch color comes from
// layerColor(id) in lib/layer-style.ts, keyed off the layer's registry id.
// Photographic rasters (Ortho, FCC — see LayerRegistryEntry.isPhotographic
// in lib/gis-registry.ts) don't need one either: there's no discrete class
// to key a swatch off, just band composition.

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
}

// Visibly provisional — a plain 5-step grey ramp, distinct from any real
// thematic palette, so a provisional legend can't be mistaken for a real one.
const PROVISIONAL_RAMP = ["#D9D9D6", "#B5B5B0", "#8C8C86", "#5E5E58", "#33332F"];

function provisionalLegend(layerId: string, classCount = 5): RasterLegend {
  return {
    layerId,
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
    classes: [
      { value: 1, label: "Non-Forest", color: "#dedede" },
      { value: 2, label: "Forest", color: "#0a8d23" },
    ],
    note: "Non-Forest renders semi-transparent so the basemap shows through, per the source doc.",
  },
  lulc: {
    layerId: "lulc",
    classes: [
      { value: 1, label: "Barren", color: "#816c65" },
      { value: 2, label: "Builtup", color: "#ff0025" },
      { value: 3, label: "Dense Vegetation", color: "#00570b" },
      { value: 4, label: "Scrub / Sparse Vegetation", color: "#96ef4d" },
      { value: 5, label: "Waterbody", color: "#1200ef" },
    ],
  },
  fragmentation: {
    layerId: "fragmentation",
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
      { value: "VDF-VDF", label: "Very Dense Forest → Very Dense Forest", shortLabel: "VDF → VDF", color: "#006400" },
      { value: "VDF-MDF", label: "Very Dense Forest → Moderately Dense Forest", shortLabel: "VDF → MDF", color: "#00A651" },
      { value: "VDF-OF", label: "Very Dense Forest → Open Forest", shortLabel: "VDF → OF", color: "#a6c34a" },
      { value: "VDF-SCRUB", label: "Very Dense Forest → Scrub", shortLabel: "VDF → Scrub", color: "#FF8C00" },
      { value: "VDF-NF", label: "Very Dense Forest → Non Forest", shortLabel: "VDF → NF", color: "#FF1493" },
      { value: "MDF-VDF", label: "Moderately Dense Forest → Very Dense Forest", shortLabel: "MDF → VDF", color: "#800080" },
      { value: "MDF-MDF", label: "Moderately Dense Forest → Moderately Dense Forest", shortLabel: "MDF → MDF", color: "#6db27c" },
      { value: "MDF-OF", label: "Moderately Dense Forest → Open Forest", shortLabel: "MDF → OF", color: "#FFD700" },
      { value: "MDF-SCRUB", label: "Moderately Dense Forest → Scrub", shortLabel: "MDF → Scrub", color: "#ff6b63" },
      { value: "MDF-NF", label: "Moderately Dense Forest → Non Forest", shortLabel: "MDF → NF", color: "#bc3a4b" },
      { value: "OF-VDF", label: "Open Forest → Very Dense Forest", shortLabel: "OF → VDF", color: "#9C27B0" },
      { value: "OF-MDF", label: "Open Forest → Moderately Dense Forest", shortLabel: "OF → MDF", color: "#00ff00" },
      { value: "OF-OF", label: "Open Forest → Open Forest", shortLabel: "OF → OF", color: "#FFFF00" },
      { value: "OF-SCRUB", label: "Open Forest → Scrub", shortLabel: "OF → Scrub", color: "#FF6600" },
      { value: "OF-NF", label: "Open Forest → Non Forest", shortLabel: "OF → NF", color: "#ff0000" },
      { value: "SCRUB-VDF", label: "Scrub → Very Dense Forest", shortLabel: "Scrub → VDF", color: "#FFB6C1" },
      { value: "SCRUB-MDF", label: "Scrub → Moderately Dense Forest", shortLabel: "Scrub → MDF", color: "#FF69B4" },
      { value: "SCRUB-OF", label: "Scrub → Open Forest", shortLabel: "Scrub → OF", color: "#DAA520" },
      { value: "SCRUB-SCRUB", label: "Scrub → Scrub", shortLabel: "Scrub → Scrub", color: "#789410" },
      { value: "SCRUB-NF", label: "Scrub → Non Forest", shortLabel: "Scrub → NF", color: "#A52A2A" },
      { value: "NF-VDF", label: "Non Forest → Very Dense Forest", shortLabel: "NF → VDF", color: "#F48FB1" },
      { value: "NF-MDF", label: "Non Forest → Moderately Dense Forest", shortLabel: "NF → MDF", color: "#E91E63" },
      { value: "NF-OF", label: "Non Forest → Open Forest", shortLabel: "NF → OF", color: "#B8860B" },
      { value: "NF-SCRUB", label: "Non Forest → Scrub", shortLabel: "NF → Scrub", color: "#cd9661" },
      { value: "NF-NF", label: "Non Forest → Non Forest", shortLabel: "NF → NF", color: "#710000" },
    ],
    note: "VDF very dense · MDF moderately dense · OF open forest · NF non forest.",
  },
  chm: {
    layerId: "chm",
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
];

export const LEGEND_CONFIG: Record<string, RasterLegend> = {
  ...REAL_LEGENDS,
  ...Object.fromEntries(PROVISIONAL_IDS.map((id) => [id, provisionalLegend(id)])),
};

export function legendFor(layerId: string): RasterLegend | undefined {
  return LEGEND_CONFIG[layerId];
}
