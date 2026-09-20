/**
 * The three selectable basemaps, per the client's UI/UX brief.
 *
 * The brief names Google Satellite and Google Hybrid. Google's tile endpoints
 * (mt*.google.com/vt) are not licensed for use outside Google's own SDKs, so
 * those two are served from Esri's World Imagery instead — visually
 * equivalent, and the standard substitution. Esri asks only for the
 * attribution below. Swapping in Google's official Map Tiles API later is a
 * change to the `tiles` URLs here plus a key proxied through the Go API;
 * nothing outside this file knows where the imagery comes from.
 *
 * All three basemaps live in the style at once and are switched by layer
 * visibility rather than by map.setStyle(), which would tear down every
 * source and layer the dashboard has added. A hidden raster layer fetches no
 * tiles, so the two that are off cost nothing.
 */

export type BasemapId = "hybrid" | "satellite" | "osm";

const ESRI_ATTRIBUTION =
  'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Highest zoom each provider actually has data for *over this study area*.
 * Past it MapLibre upscales the deepest real tile instead of requesting one
 * that does not exist, which is what keeps the imagery present — soft, but
 * continuous — when someone zooms right in on a drone layer.
 *
 * These are measured, not assumed, and they differ per provider, which is why
 * there is no single constant:
 *
 *   Esri World Imagery  real tiles to z18. From z19 it answers 200 with an
 *                       identical 2,521-byte "Map data not yet available"
 *                       placeholder rather than a 404, so nothing errors —
 *                       the grey tile simply gets drawn. Capping at 18 is the
 *                       only way to stop it.
 *   Esri reference      same ceiling. Both are fully transparent out here
 *                       anyway, so this only saves pointless requests.
 *   OpenStreetMap       real tiles to z19, then HTTP 400.
 *
 * Coverage is per-region: somewhere denser than rural Gujarat, Esri may well
 * publish deeper. Re-measure before treating these as global truths.
 */
const ESRI_MAX_ZOOM = 18;
const OSM_MAX_ZOOM = 19;

interface TileSourceDef {
  id: string;
  tiles: string[];
  attribution: string;
  maxZoom: number;
}

/**
 * Note the {z}/{y}/{x} ordering on the Esri services — ArcGIS REST puts row
 * before column, the opposite of OSM's {z}/{x}/{y}. Getting this backwards
 * yields a map that loads real tiles in entirely the wrong places.
 */
const SOURCES: TileSourceDef[] = [
  {
    id: "esri-imagery",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: ESRI_ATTRIBUTION,
    maxZoom: ESRI_MAX_ZOOM,
  },
  {
    // Roads. Transparent, and by far the denser of the two reference layers —
    // over the study area's rural hills the places layer is nearly empty
    // while this one still carries the road network, which is most of what
    // makes a hybrid readable here.
    id: "esri-transportation",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: ESRI_ATTRIBUTION,
    maxZoom: ESRI_MAX_ZOOM,
  },
  {
    // Place names and administrative boundaries, also transparent. Sparse out
    // in the hills, but it is what labels Palitana, Bhavnagar and the talukas.
    id: "esri-places",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: ESRI_ATTRIBUTION,
    maxZoom: ESRI_MAX_ZOOM,
  },
  {
    id: "osm",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: OSM_ATTRIBUTION,
    maxZoom: OSM_MAX_ZOOM,
  },
];

/**
 * Draw order, bottom to top. The two reference layers sit above the imagery
 * (and above OSM, which never shows at the same time as either), with place
 * names last so a label is never buried under a road — that ordering is what
 * makes Hybrid legible.
 */
const LAYERS: { id: string; source: string }[] = [
  { id: "basemap-imagery", source: "esri-imagery" },
  { id: "basemap-osm", source: "osm" },
  { id: "basemap-roads", source: "esri-transportation" },
  { id: "basemap-places", source: "esri-places" },
];

export interface BasemapDef {
  id: BasemapId;
  label: string;
  /** Which of LAYERS this basemap shows. Every other basemap layer hides. */
  layers: string[];
  attribution: string;
  /**
   * A real tile of the study area itself (z12, the tile covering Palitana),
   * so each swatch previews the imagery you would actually get rather than a
   * bundled stock thumbnail that drifts out of date.
   */
  thumbnail: string;
}

const PREVIEW_Z = 12;
const PREVIEW_X = 2864;
const PREVIEW_Y = 1797;

function previewTile(sourceId: string): string {
  const source = SOURCES.find((s) => s.id === sourceId)!;
  return source.tiles[0]
    .replace("{z}", String(PREVIEW_Z))
    .replace("{x}", String(PREVIEW_X))
    .replace("{y}", String(PREVIEW_Y));
}

// Order here is the order the switcher renders them in.
export const BASEMAPS: BasemapDef[] = [
  {
    id: "hybrid",
    label: "Hybrid",
    layers: ["basemap-imagery", "basemap-roads", "basemap-places"],
    attribution: ESRI_ATTRIBUTION,
    thumbnail: previewTile("esri-imagery"),
  },
  {
    id: "satellite",
    label: "Satellite",
    layers: ["basemap-imagery"],
    attribution: ESRI_ATTRIBUTION,
    thumbnail: previewTile("esri-imagery"),
  },
  {
    id: "osm",
    label: "OSM Standard",
    layers: ["basemap-osm"],
    attribution: OSM_ATTRIBUTION,
    thumbnail: previewTile("osm"),
  },
];

/** Per the brief: Hybrid is the active basemap on load. */
export const DEFAULT_BASEMAP: BasemapId = "hybrid";

export function basemapById(id: BasemapId): BasemapDef {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

/**
 * How far in the map lets anyone zoom.
 *
 * Capping each source stops the placeholder being *fetched* — MapLibre then
 * upscales its deepest real tile instead. That is honest, but it still lets
 * someone zoom to a blurry z22 and wonder what is broken, so the camera stops
 * where the imagery does.
 *
 * Taken as the shallowest ceiling across the providers, so the limit holds
 * whichever basemap is showing rather than lurching when someone switches.
 * The cost is one level on OSM, which does publish a real z19 here.
 *
 * 18 gives up no real detail: at this latitude it is about 0.56 m per pixel,
 * and the sharpest overlay served — the drone orthomosaic, 4096 px across
 * roughly 8.9 km — is about 2.2 m per pixel, so it is already upscaled well
 * before this point.
 */
export const MAX_MAP_ZOOM = Math.min(...SOURCES.map((s) => s.maxZoom));

/** Every basemap layer id, so the visibility pass can hide the ones that are off. */
export const BASEMAP_LAYER_IDS: string[] = LAYERS.map((l) => l.id);

/**
 * The topmost basemap layer. Everything the dashboard adds must go above it,
 * and nothing must go below it — passing this as `beforeId` is wrong, it is
 * the floor, not a ceiling.
 */
export const BASEMAP_TOP_LAYER_ID = LAYERS[LAYERS.length - 1].id;

/** The style's `sources` block — every basemap's tiles, declared up front. */
export function basemapSources() {
  return Object.fromEntries(
    SOURCES.map((s) => [
      s.id,
      {
        type: "raster" as const,
        tiles: s.tiles,
        tileSize: 256,
        maxzoom: s.maxZoom,
        attribution: s.attribution,
      },
    ]),
  );
}

/** The style's basemap `layers`, with only `active`'s own layers visible. */
export function basemapLayers(active: BasemapId) {
  const shown = new Set(basemapById(active).layers);
  return LAYERS.map((l) => ({
    id: l.id,
    type: "raster" as const,
    source: l.source,
    layout: { visibility: (shown.has(l.id) ? "visible" : "none") as "visible" | "none" },
  }));
}
