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
  /**
   * Set on a vector layer's range class (Existing Vantalavadi's area
   * classes): the class runs from `min` up to the next class's `min`, and
   * the map colours by numeric range instead of matching `value` exactly.
   * `max` is for display only.
   */
  min?: number;
  max?: number;
  /** Further property values drawn in this class (Trees' Predicted_SN spellings). */
  aliases?: string[];
  /** Set on a species class (Trees): its Gujarati name, shown after the label. */
  gujaratiName?: string;
  /**
   * Set on a counted class (Trees' species): shown after the label, and the
   * legend totals them under the class list.
   */
  count?: number;
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
   * Marks a legend that is a band key rather than a palette — an orthomosaic
   * or a false-colour composite, whose R/G/B rows say which channel carries
   * which band and name no colour the map is actually painted in. Such a
   * theme has no colour that could stand for it in a list.
   */
  channels?: boolean;
  /**
   * Set on a placeholder legend — a theme whose real palette has not been
   * delivered. Its greys are a stand-in, so nothing should present them as
   * the theme's colour.
   */
  provisional?: boolean;
  /**
   * Tick labels along the bar, one per class, evenly spaced. Only for a
   * theme whose classes really do divide the scale evenly — Aspect's eight
   * 45° compass sectors do; nothing else delivered so far does, and spacing
   * ticks evenly over unequal classes would misreport where the breaks are.
   */
  rampTicks?: string[];
  /**
   * Draw the bar alone, with no class list under it. For a continuous
   * surface whose colour doc names only the two ends (Wildlife Corridors'
   * low → high cost), where middle rows would have nothing to say.
   */
  rampOnly?: boolean;
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
    provisional: true,
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
      { value: 2, label: "Moderately Dense Forest", color: "#00ff00" },
      { value: 3, label: "Open Forest", color: "#ffff00" },
      { value: 4, label: "Scrub", color: "#ff0000" },
      { value: 5, label: "Non Forest", color: "#ffffff" },
    ],
  },
  // Drone-derived 2026 density, in the same five classes as Forest Cover but
  // its own palette. No colour doc came with it: these are the imagery's five
  // colours (the rest are its edge anti-aliasing), assigned by matching each
  // colour's pixel count against the class areas in the client's Tree Density
  // Drone.xlsx — all five rank exactly as the classes do. Non Forest's light
  // grey covers fewer pixels than its area would suggest.
  // Replace with the client's palette if one is delivered.
  "tree-density": {
    layerId: "tree-density",
    ramp: "high-to-low",
    rampLabels: ["Non forest", "Very dense forest"],
    classes: [
      { value: 1, label: "Very Dense Forest", color: "#06660c" },
      { value: 2, label: "Moderately Dense Forest", color: "#228b22" },
      { value: 3, label: "Open Forest", color: "#ffff00" },
      { value: 4, label: "Scrub", color: "#ff0000" },
      { value: 5, label: "Non Forest", color: "#f1f1f1" },
    ],
  },
  // FSI 2023 (Forest Survey of India), delivered as rasters with the client's
  // Legend.xlsx. Values are the classes' own names, which is how the
  // delivered statistics (overlay_class_stats.class_value) find their colours.
  // White is "Other": the rest of the study area, outside every FSI class.
  "forest-cover-fsi": {
    layerId: "forest-cover-fsi",
    classes: [
      {
        value: "MODERATELY DENSE FOREST (Tree Canopy density 40% & above but < 70%)",
        label: "Moderately Dense Forest",
        color: "#00ff00",
      },
      {
        value: "OPEN FOREST (Tree Canopy density 10% & above but < 40%)",
        label: "Open Forest",
        color: "#ffff00",
      },
      { value: "SCRUB (Tree Canopy density < 10%)", label: "Scrub", color: "#ff0000" },
      { value: "WATER", label: "Water", color: "#009ee0" },
      { value: "Other", label: "Other", color: "#ffffff" },
    ],
  },
  "forest-type-fsi": {
    layerId: "forest-type-fsi",
    classes: [
      {
        value: "3B/C2 Southern moist mixed deciduous forest",
        label: "3B/C2 Southern moist mixed deciduous forest",
        color: "#1f6600",
      },
      { value: "5/DS4 Dry Grassland", label: "5/DS4 Dry Grassland", color: "#f7d161" },
      {
        value: "5/E1 Anogeissus pendula Forest",
        label: "5/E1 Anogeissus pendula Forest",
        color: "#ed7ad4",
      },
      {
        value: "5/E 8c Salvadora-T amarix scrub",
        label: "5/E 8c Salvadora-Tamarix scrub",
        color: "#4fc26e",
      },
      { value: "Acacia senegal forest", label: "Acacia senegal forest", color: "#12abf5" },
      { value: "6/E4 Salvadora scrub", label: "6/E4 Salvadora scrub", color: "#f5c429" },
      { value: "Water", label: "Water", color: "#4014f7" },
      { value: "Other", label: "Other", color: "#ffffff" },
    ],
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
      { value: 1, label: "Barren", color: "#dd8db4" },
      { value: 2, label: "Builtup", color: "#ff0025" },
      { value: 3, label: "Dense Vegetation", color: "#09ac00" },
      { value: 4, label: "Scrub / Sparse Vegetation", color: "#7cbc7e" },
      { value: 5, label: "Waterbody", color: "#3976c9" },
    ],
  },
  // Drone-sourced 2026 LULC — its own palette, from the client's legend
  // colour doc (the image was recoloured to match).
  "current-land-use": {
    layerId: "current-land-use",
    classes: [
      { value: 1, label: "Barren", color: "#dd9aba" },
      { value: 2, label: "Builtup", color: "#ff0025" },
      { value: 3, label: "Dense Vegetation", color: "#089600" },
      { value: 4, label: "Scrub / Sparse Vegetation", color: "#3fbc43" },
      { value: 5, label: "Waterbodies", color: "#000eff" },
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
      { value: "core-small", label: "Core (<101 Hectares)", color: "#01bd00" },
      { value: "core-medium", label: "Core (101-202 Hectares)", color: "#009000" },
      { value: "core-large", label: "Core (>202 Hectares)", color: "#004e00" },
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
  // Flood Depth is one raster theme with five selectable images (see
  // sections.ts's "flood-depth" group), one per simulated depth -- like
  // Forest/Green Cover's Yearwise groups, but where a year's legend never
  // changes, each flood image's four classes cover different depth ranges.
  // So these are keyed by the overlay's own key (legendFor's imageKey
  // param), not by the theme id, and legendFor is asked for the image key
  // first everywhere a specific image is on screen.
  flood0_5m: {
    layerId: "flood0_5m",
    ramp: "low-to-high",
    rampLabels: ["0 m", "0.5 m"],
    classes: [
      { value: 1, label: "0 – 0.12 m", color: "#28bceb" },
      { value: 2, label: "0.12 – 0.25 m", color: "#a4fc3c" },
      { value: 3, label: "0.25 – 0.37 m", color: "#fb7e21" },
      { value: 4, label: "0.37 – 0.50 m", color: "#7a0403" },
    ],
  },
  flood1m: {
    layerId: "flood1m",
    ramp: "low-to-high",
    rampLabels: ["0 m", "1 m"],
    classes: [
      { value: 1, label: "0 – 0.25 m", color: "#28bceb" },
      { value: 2, label: "0.25 – 0.50 m", color: "#a4fc3c" },
      { value: 3, label: "0.50 – 0.75 m", color: "#fb7e21" },
      { value: 4, label: "0.75 – 1.0 m", color: "#7a0403" },
    ],
  },
  flood2m: {
    layerId: "flood2m",
    ramp: "low-to-high",
    rampLabels: ["0 m", "2 m"],
    classes: [
      { value: 1, label: "0 – 0.5 m", color: "#28bceb" },
      { value: 2, label: "0.5 – 1.0 m", color: "#a4fc3c" },
      { value: 3, label: "1.0 – 1.5 m", color: "#fb7e21" },
      { value: 4, label: "1.5 – 2.0 m", color: "#7a0403" },
    ],
  },
  flood5m: {
    layerId: "flood5m",
    ramp: "low-to-high",
    rampLabels: ["0 m", "5 m"],
    classes: [
      { value: 1, label: "0 – 1.25 m", color: "#28bceb" },
      { value: 2, label: "1.25 – 2.50 m", color: "#a4fc3c" },
      { value: 3, label: "2.50 – 3.75 m", color: "#fb7e21" },
      { value: 4, label: "3.75 – 5.0 m", color: "#7a0403" },
    ],
  },
  flood10m: {
    layerId: "flood10m",
    ramp: "low-to-high",
    rampLabels: ["0 m", "10 m"],
    classes: [
      { value: 1, label: "0 – 2.5 m", color: "#28bceb" },
      { value: 2, label: "2.5 – 5.0 m", color: "#a4fc3c" },
      { value: 3, label: "5.0 – 7.5 m", color: "#fb7e21" },
      { value: 4, label: "7.5 – 10 m", color: "#7a0403" },
    ],
  },
  // Theme-level fallback: same four colours, level-agnostic labels. Used
  // wherever the theme is shown without a specific image picked (the
  // sidebar/picker swatch dot) -- see legendFor.
  "flood-depth": {
    layerId: "flood-depth",
    ramp: "low-to-high",
    rampLabels: ["Shallowest", "Deepest"],
    classes: [
      { value: 1, label: "Shallowest", color: "#28bceb" },
      { value: 2, label: "Shallow-mid", color: "#a4fc3c" },
      { value: 3, label: "Mid-deep", color: "#fb7e21" },
      { value: 4, label: "Deepest", color: "#7a0403" },
    ],
    note: "Exact depth ranges depend on the selected flood level.",
  },
  chm: {
    layerId: "chm",
    ramp: "low-to-high",
    rampLabels: ["1.50 m", "30 m"],
    classes: [
      { value: 1, label: "1.50 – 3.0 m", color: "#ffb300" },
      { value: 2, label: "3.0 – 4.5 m", color: "#a4d02c" },
      { value: 3, label: "4.5 – 6.0 m", color: "#6a992c" },
      { value: 4, label: "6.0 – 7.5 m", color: "#4b862c" },
      { value: 5, label: "7.5 – 9.0 m", color: "#306d24" },
      { value: 6, label: "9.0 – 10.5 m", color: "#1f4d16" },
      { value: 7, label: "10.5 – 12.0 m", color: "#134908" },
      { value: 8, label: "12.0 – 13.5 m", color: "#103702" },
      { value: 9, label: "13.5 – 15.0 m", color: "#1d3900" },
      { value: 10, label: "15.0 – 16.5 m", color: "#435011" },
      { value: 11, label: "16.5 – 18.0 m", color: "#5a5518" },
      { value: 12, label: "18.0 – 19.5 m", color: "#71591f" },
      { value: 13, label: "19.5 – 30.0 m", color: "#6c1b15" },
    ],
  },
  // LST: client's 9-bucket colour ramp, coolest to hottest. The coolest
  // class was handed over as ">10" in the client's doc; kept verbatim since
  // its position in the ramp (coolest colour, first in the list) reads as
  // "below 10°C" rather than "above" — flag if the client confirms a fix.
  "land-surface-temperature": {
    layerId: "land-surface-temperature",
    ramp: "low-to-high",
    rampLabels: ["< 10°C", "45 – 50°C"],
    classes: [
      { value: 1, label: "> 10°C", color: "#5ea7b1" },
      { value: 2, label: "10 – 15°C", color: "#91cba8" },
      { value: 3, label: "15 – 20°C", color: "#bce4a9" },
      { value: 4, label: "20 – 25°C", color: "#ddf1b4" },
      { value: 5, label: "25 – 30°C", color: "#ffffbf" },
      { value: 6, label: "30 – 35°C", color: "#fedf99" },
      { value: 7, label: "35 – 40°C", color: "#fdbe74" },
      { value: 8, label: "40 – 45°C", color: "#f59053" },
      { value: 9, label: "45 – 50°C", color: "#e65538" },
    ],
  },
  // DSM/DTM: the colour doc names a cpt-city gradient (DEM_screen,
  // wiki-knutux) and gives its stops with their elevation ranges.
  dsm: {
    layerId: "dsm",
    ramp: "low-to-high",
    rampLabels: ["0 m", "611 m"],
    classes: [
      { value: 1, label: "0 – 76 m", color: "#008435" },
      { value: 2, label: "76 – 153 m", color: "#33cc00" },
      { value: 3, label: "153 – 305 m", color: "#f4f071" },
      { value: 4, label: "305 – 382 m", color: "#f4bd45" },
      { value: 5, label: "382 – 458 m", color: "#99642b" },
      { value: 6, label: "458 – 611 m", color: "#ffffff" },
    ],
  },
  dtm: {
    layerId: "dtm",
    ramp: "low-to-high",
    rampLabels: ["0 m", "604 m"],
    classes: [
      { value: 1, label: "0 – 121 m", color: "#4aad5a" },
      { value: 2, label: "121 – 242 m", color: "#b5d663" },
      { value: 3, label: "242 – 363 m", color: "#ffe710" },
      { value: 4, label: "363 – 484 m", color: "#ff9c08" },
      { value: 5, label: "484 – 604 m", color: "#ff7b10" },
    ],
  },
  "growing-stock": {
    layerId: "growing-stock",
    ramp: "low-to-high",
    rampLabels: ["0.03 m³/ha", "> 5.0 m³/ha"],
    classes: [
      { value: 1, label: "0.03 – 1.5 m³/ha", color: "#30123b" },
      { value: 2, label: "1.5 – 2.5 m³/ha", color: "#28bceb" },
      { value: 3, label: "2.5 – 3.5 m³/ha", color: "#a4fc3c" },
      { value: 4, label: "3.5 – 5.0 m³/ha", color: "#fb7e21" },
      { value: 5, label: "> 5.0 m³/ha", color: "#7a0403" },
    ],
  },
  "habitat-suitability": {
    layerId: "habitat-suitability",
    ramp: "low-to-high",
    classes: [
      { value: 1, label: "Not Suitable", color: "#d7191c" },
      { value: 2, label: "Least Suitable", color: "#fdae61" },
      { value: 3, label: "Moderately Suitable", color: "#ffffc0" },
      { value: 4, label: "Highly Suitable", color: "#a6d96a" },
      { value: 5, label: "Best Suitable", color: "#1a9641" },
    ],
  },
  // Slope and Aspect used to be one continuous raster each, with a class
  // list here. Re-delivered as one raster per class (static_overlays'
  // slopeCat*/aspectCat* rows), each carrying its own flat `color` straight
  // off this same palette — see init.sql — so there is no class list left to
  // key a legend off; the sidebar's chip colours and the Legend's swatches
  // are the whole of it now.
  // Not a class list — the generic R/G/B channel key for a photographic
  // raster (true-color composite: each channel is literally that band).
  orthomosaic: {
    layerId: "orthomosaic",
    channels: true,
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
    channels: true,
    classes: [
      { value: "R", label: "Red Band", color: "#FF0000" },
      { value: "G", label: "Green Band", color: "#00FF00" },
      { value: "B", label: "Blue Band", color: "#0000FF" },
    ],
    note: "Band-to-channel mapping varies by year — see init.sql's FCC comment.",
  },
  "wildlife-corridors": {
    layerId: "wildlife-corridors",
    ramp: "low-to-high",
    rampOnly: true,
    rampLabels: ["Low Cost", "High Cost"],
    classes: [
      { value: 1, label: "Low Cost", color: "#a6611a" },
      { value: 2, label: "Low-Mid Cost", color: "#dfc27d" },
      { value: 3, label: "Mid Cost", color: "#f5f5f5" },
      { value: 4, label: "Mid-High Cost", color: "#80cdc1" },
      { value: 5, label: "High Cost", color: "#018571" },
    ],
  },
  tof: {
    layerId: "tof",
    classes: [
      { value: "Block TOF", label: "Block TOF", color: "#234f1a" },
      { value: "Built-up TOF", label: "Builtup TOF", color: "#00ffeb" },
      { value: "Linear TOF", label: "Linear TOF", color: "#ffff00" },
      { value: "Scattered TOF", label: "Scattered TOF", color: "#875400" },
    ],
  },
};

// Still-pending themes: no palette delivered yet.
const PROVISIONAL_IDS = [
  "ecological-degradation",
  "tree-height",
  "agb",
  "carbon-stock",
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
 * Lives here rather than in the legend component because the JPG export
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
 * How a raster theme is represented as a single dot in a layer list.
 *
 * A theme has a palette rather than a colour, so something has to stand for
 * it. A ramped palette is represented by its high end — dense forest, tall
 * canopy, steep ground — which is what the theme is about and what someone
 * is looking for on the map. A palette with no order to it has no such end,
 * so it is shown as itself. A band key stands for nothing: an orthomosaic is
 * not red just because its first row is the red channel.
 */
export type LayerDot =
  | { kind: "solid"; color: string }
  | { kind: "palette"; colors: string[] }
  | { kind: "none" };

/**
 * Colours in a dot before it stops being one. Vegetation Change's palette is
 * 25 classes; sliced across 8 pixels that is a third of a pixel each, which
 * reads as mud. Sampling across the palette keeps the dot recognisably that
 * theme's without pretending to show every class.
 */
const MAX_DOT_COLORS = 6;

function sample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  return Array.from(
    { length: limit },
    (_, i) => items[Math.round((i * (items.length - 1)) / (limit - 1))],
  );
}

export function legendDot(legend: RasterLegend | undefined): LayerDot {
  // A placeholder palette says nothing about the theme, and every provisional
  // theme shares the same greys — ten identical near-black dots would be
  // worse than none.
  if (!legend || legend.channels || legend.provisional) return { kind: "none" };
  if (legend.classes.length === 0) return { kind: "none" };

  const scale = rampScale(legend);
  if (scale) {
    const high = scale.classes[scale.classes.length - 1];
    return { kind: "solid", color: high.color };
  }
  return { kind: "palette", colors: sample(legend.classes, MAX_DOT_COLORS).map((c) => c.color) };
}

/**
 * `layerId` is a raster theme's group key, straight off its `layer_groups`
 * row — the same id lib/sections.ts puts on a SectionDef. Renaming a group's
 * key in the seed therefore means renaming its entry here; renaming only its
 * *label* does not.
 */
/**
 * Looks up a raster theme's legend, or a specific image's own legend when
 * one exists and the theme's classes vary by the image on screen (Flood
 * Depth's five levels each cover different ranges under the same theme id).
 * Falls back to the theme id, which is all every other theme has ever set.
 */
export function legendFor(layerId: string, imageKey?: string): RasterLegend | undefined {
  return (imageKey && LEGEND_CONFIG[imageKey]) || LEGEND_CONFIG[layerId];
}
