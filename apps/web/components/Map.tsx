"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  LngLatBounds,
  Popup,
  type FilterSpecification,
  type GeoJSONSource,
  type ImageSource,
  type IControl,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2 } from "lucide-react";
import { boundsOfFeature } from "@/lib/geo";
import { popupHtml } from "@/lib/feature-popup";
import {
  BASEMAP_LAYER_IDS,
  DEFAULT_BASEMAP,
  basemapById,
  basemapLayers,
  basemapSources,
  type BasemapId,
} from "@/lib/basemaps";
import { MapControls } from "@/components/MapControls";
import { CoordinateReadout } from "@/components/CoordinateReadout";
import type { OverlayDef } from "@/lib/static-overlays";
import type { LayerFeature, LayerCollection } from "@/lib/layers-api";

const POLYGON_TYPES = new Set(["Polygon", "MultiPolygon"]);
const LINE_TYPES = new Set(["LineString", "MultiLineString"]);
const POINT_TYPES = new Set(["Point", "MultiPoint"]);

// The ground behind the basemap tiles — all you see while they load, and in
// any gap past the edge of coverage. Mirrors --background from globals.css's
// dark palette (oklch(0.192 0.003 96)), so a slow tile fetch reads as the page
// continuing rather than as a hole punched in it.
const MAP_BACKGROUND = "#151413";

// Casing under every line, and the stroke around every point: a light halo
// that keeps hairline geometry legible over dark imagery. Deliberately *not*
// MAP_BACKGROUND — its whole job is to stand off the basemap, so the two must
// not track each other.
const CASING = "#EDEDE8";

const INITIAL_CENTER: [number, number] = [71.7800412, 21.4718707]; // Shetrunjay Hill Range, near Palitana
const INITIAL_ZOOM = 11;

// Stroke widths. A flow overlay MUST be exactly as wide as the base layer it
// animates over: narrower leaves a sliver of layer colour down each side of
// every gap, wider paints over the neighbouring geometry. As constants the
// pairing is structural, so thinning a line cannot silently break its dashes.
const LINE_WIDTH = 1;
const LINE_CASING_WIDTH = 2;
const OUTLINE_WIDTH = 0.75;

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// Shared, so a caller that passes nothing doesn't hand the reconcile effect
// below a fresh array identity on every render.
const EMPTY_RASTERS: RasterOverlay[] = [];

// A raster theme currently switched on — imagery from a `static_overlays`
// row (served through the API, see lib/overlays-api.ts), placed at that row's
// own extent since the files carry no embedded geo tags.
//
// Several can be on at once, so each gets its own image source and layer
// keyed by `id`; `url` changes when the theme's selected year changes.
export interface RasterOverlay {
  /** Stable per theme, not per year — the section's slug. */
  id: string;
  url: string;
  bounds: LngLatBoundsLike;
  opacity: number;
}

const RASTER_SOURCE_PREFIX = "raster-overlay-";
const RASTER_LAYER_PREFIX = "raster-overlay-layer-";

const rasterSourceId = (id: string) => `${RASTER_SOURCE_PREFIX}${id}`;
const rasterLayerId = (id: string) => `${RASTER_LAYER_PREFIX}${id}`;

/**
 * The lowest layer that is *not* basemap or raster imagery — i.e. the first
 * vector layer. Every raster is inserted before it, which is what keeps
 * "vector data on top of all raster data" (the brief's Layer Structure note)
 * true no matter what order things happen to be switched on in.
 *
 * Returns undefined when no vector layer exists yet; MapLibre then appends,
 * and any vector layer added later lands above it anyway.
 */
function firstVectorLayerId(map: MapLibreMap): string | undefined {
  for (const layer of map.getStyle().layers) {
    if (layer.id === "background") continue;
    if (BASEMAP_LAYER_IDS.includes(layer.id)) continue;
    if (layer.id.startsWith(RASTER_LAYER_PREFIX)) continue;
    return layer.id;
  }
  return undefined;
}

/** SW/NE bounds → the four corners an image source wants, clockwise from NW. */
function imageCoordinates(
  bounds: LngLatBoundsLike,
): [[number, number], [number, number], [number, number], [number, number]] {
  const b = LngLatBounds.convert(bounds);
  return [
    b.getNorthWest().toArray() as [number, number],
    b.getNorthEast().toArray() as [number, number],
    b.getSouthEast().toArray() as [number, number],
    b.getSouthWest().toArray() as [number, number],
  ];
}

// Marching-ants dash frames for the reference-layer flow animation.
// line-dasharray takes no expression, so it can't vary per feature and can't
// be tweened — the only way to animate it is to swap the whole array each
// frame, which is why this is a hand-rolled loop rather than a MapLibre
// transition.
//
// The sequence is the standard 14-frame one: the dash grows from the start of
// the pattern to its end, then the gap does the same, which lands back on the
// opening frame — so it cycles forever with no visible seam.
const DASH_SEQUENCE: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

/** ms per frame — 14 frames, so the loop takes a shade under a second. */
const DASH_STEP_MS = 65;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

// MapLibre's built-in attribution control is a native <details>/<summary>
// element that opens itself on first paint no matter what options it's
// given — there's no way to start it closed short of fighting its internal
// state after the fact, which breaks its own click handling. A small custom
// control using the same CSS classes gets the identical look with a toggle
// we fully own.
class CompactAttribution implements IControl {
  private container: HTMLDivElement;
  private inner: HTMLDivElement;
  private open = false;

  constructor(html: string) {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-attrib-button";
    button.setAttribute("aria-label", "Toggle attribution");
    button.addEventListener("click", () => {
      this.open = !this.open;
      this.container.classList.toggle("maplibregl-compact-show", this.open);
    });

    this.inner = document.createElement("div");
    this.inner.className = "maplibregl-ctrl-attrib-inner";
    this.inner.innerHTML = html;

    this.container.append(button, this.inner);
  }

  /** Swapped when the basemap changes — each provider credits differently. */
  setHTML(html: string): void {
    this.inner.innerHTML = html;
  }

  onAdd(): HTMLElement {
    return this.container;
  }

  onRemove(): void {
    this.container.remove();
  }
}

// All three basemaps are declared up front and switched by visibility — see
// lib/basemaps.ts for why that beats map.setStyle().
function mapStyle(basemap: BasemapId) {
  return {
    version: 8 as const,
    sources: basemapSources(),
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": MAP_BACKGROUND },
      },
      ...basemapLayers(basemap),
    ],
  };
}

function byGeometryType(
  data: LayerCollection,
  types: Set<string>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    // colour rides along per feature (stamped in lib/layers-api.ts) so paint
    // reads ["get", "color"] — no layer name/id branch in the paint
    // expression itself.
    features: data.features.filter((f) => types.has(f.geometry.type)),
  };
}

/** The one layer per vector overlay that should answer a click. */
function hitLayerId(def: OverlayDef): string {
  const sourceId = `overlay-${def.key}`;
  if (def.kind === "line") return `${sourceId}-line`;
  if (def.kind === "point") return `${sourceId}-circle`;
  return `${sourceId}-fill`;
}

/**
 * Every layer a click should be tested against, resolved at click time rather
 * than bound once: overlay layers are added as their metadata arrives, so a
 * fixed list captured at map load would miss all of them.
 *
 * Casing and flow layers are left out deliberately — they are decoration drawn
 * over the real layer, and including them would return the same feature twice.
 */
function clickableLayerIds(map: MapLibreMap, defs: OverlayDef[]): string[] {
  const ids = ["polygons-fill", "lines", "points", ...defs.map(hitLayerId)];
  return ids.filter((id) => map.getLayer(id));
}

/** Which overlay a hit layer belongs to, so the popup can title itself. */
function labelForLayer(layerId: string, defs: OverlayDef[]): string {
  const def = defs.find((d) => hitLayerId(d) === layerId);
  return def?.label ?? "Feature";
}

/**
 * Click popups for vector features.
 *
 * The client reported that "any Vector Data is not showing metadata on
 * clicking", and it was not: this only ever bound the three `layers`-table
 * layer ids, which nothing is currently seeded into, and printed a single
 * `name` property. The static overlays — which are everything actually drawn
 * — had no click handler at all.
 *
 * Bound as one map-level handler that queries at click time, so overlays
 * added later are covered without rebinding.
 */
function attachPopups(map: MapLibreMap, defsRef: { current: OverlayDef[] }): Popup {
  const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px" });

  map.on("click", (e) => {
    const layers = clickableLayerIds(map, defsRef.current);
    if (layers.length === 0) return;

    const hits = map.queryRenderedFeatures(e.point, { layers });
    const feature = hits[0] as MapGeoJSONFeature | undefined;
    if (!feature) {
      popup.remove();
      return;
    }

    const label =
      typeof feature.properties?.name === "string"
        ? feature.properties.name
        : labelForLayer(feature.layer.id, defsRef.current);

    popup
      .setLngLat(e.lngLat)
      .setHTML(popupHtml(label, feature.properties))
      .addTo(map);
  });

  // Cursor feedback, from the same query — a per-layer mouseenter/mouseleave
  // pair would have to be rebound every time an overlay is added.
  map.on("mousemove", (e) => {
    const layers = clickableLayerIds(map, defsRef.current);
    const over = layers.length > 0 && map.queryRenderedFeatures(e.point, { layers }).length > 0;
    map.getCanvas().style.cursor = over ? "pointer" : "";
  });

  return popup;
}

// Unfiltered MapLibre layers draw every feature, which would make a freshly
// added layer default to "all visible" — the opposite of no default
// selection. Layers start with this empty-set filter; the visibility effect
// below replaces it once a switch is actually turned on.
const NO_FEATURES_FILTER: FilterSpecification = ["in", ["get", "id"], ["literal", []]];

function addLayers(
  map: MapLibreMap,
  polygons: GeoJSON.FeatureCollection,
  lines: GeoJSON.FeatureCollection,
  points: GeoJSON.FeatureCollection,
) {
  map.addSource("polygons", { type: "geojson", data: polygons });
  map.addSource("lines", { type: "geojson", data: lines });
  map.addSource("points", { type: "geojson", data: points });

  map.addLayer({
    id: "polygons-fill",
    type: "fill",
    source: "polygons",
    filter: NO_FEATURES_FILTER,
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.25 },
  });
  map.addLayer({
    id: "polygons-outline",
    type: "line",
    source: "polygons",
    filter: NO_FEATURES_FILTER,
    paint: { "line-color": ["get", "color"], "line-width": OUTLINE_WIDTH },
  });

  // casing under stroke: a wider surface-colour line beneath the layer
  // colour keeps every line legible against the basemap (design system §2).
  map.addLayer({
    id: "lines-casing",
    type: "line",
    source: "lines",
    filter: NO_FEATURES_FILTER,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": CASING, "line-width": LINE_CASING_WIDTH },
  });
  map.addLayer({
    id: "lines",
    type: "line",
    source: "lines",
    filter: NO_FEATURES_FILTER,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ["get", "color"], "line-width": LINE_WIDTH },
  });

  map.addLayer({
    id: "points",
    type: "circle",
    source: "points",
    filter: NO_FEATURES_FILTER,
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 6,
      "circle-stroke-width": 2,
      "circle-stroke-color": CASING,
    },
  });
}

/**
 * Every flow layer on the map, in the order they were added. These are the
 * surface-coloured dashes that travel along the reference geometry the layer
 * beneath already drew in its own colour, so what animates reads as moving
 * gaps in that line rather than a second line of its own.
 */
function flowLayerIds(defs: OverlayDef[]): string[] {
  return defs.map(({ key }) => `overlay-${key}-flow`);
}

// Static overlays (Base Layers + Watershed Analysis sections): added once,
// hidden, and toggled purely via layout visibility — the same lazy pattern
// as the raster overlay above, which avoids the add/remove churn that causes
// "missing layer" errors when a switch is flipped rapidly. Safe to call
// repeatedly with a growing def list (e.g. once the overlay-metadata fetch
// lands after the map has already loaded) — an existing source is skipped.
function addOverlaySources(map: MapLibreMap, defs: OverlayDef[]) {
  for (const { key, kind, color } of defs) {
    const sourceId = `overlay-${key}`;
    if (map.getSource(sourceId)) continue;
    map.addSource(sourceId, { type: "geojson", data: EMPTY_FC });

    if (kind === "line") {
      map.addLayer({
        id: `${sourceId}-casing`,
        type: "line",
        source: sourceId,
        layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
        paint: { "line-color": CASING, "line-width": LINE_CASING_WIDTH },
      });
      map.addLayer({
        id: `${sourceId}-line`,
        type: "line",
        source: sourceId,
        layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
        paint: { "line-color": color, "line-width": LINE_WIDTH },
      });
      map.addLayer({
        id: `${sourceId}-flow`,
        type: "line",
        source: sourceId,
        // Butt caps, not round: a round cap on every dash bleeds the dashes
        // into each other and the flow stops reading as movement.
        layout: { visibility: "none", "line-cap": "butt", "line-join": "round" },
        paint: {
          "line-color": CASING,
          "line-width": LINE_WIDTH,
          "line-dasharray": DASH_SEQUENCE[0],
        },
      });
    } else if (kind === "point") {
      // No casing/flow here — the dash animation is a line-only effect, and
      // startDashAnimation already no-ops on a layer id that doesn't exist.
      map.addLayer({
        id: `${sourceId}-circle`,
        type: "circle",
        source: sourceId,
        layout: { visibility: "none" },
        paint: {
          "circle-color": color,
          "circle-radius": 2.5,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": CASING,
        },
      });
    } else {
      // An 'outline' layer still gets a fill, drawn fully transparent. It is
      // never seen, but MapLibre hit-tests geometry rather than pixels, so it
      // is what lets a boundary be clicked anywhere inside it rather than
      // only on the hairline itself.
      map.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        layout: { visibility: "none" },
        paint: { "fill-color": color, "fill-opacity": kind === "outline" ? 0 : 0.15 },
      });
      map.addLayer({
        id: `${sourceId}-outline`,
        type: "line",
        source: sourceId,
        layout: { visibility: "none" },
        paint: { "line-color": color, "line-width": OUTLINE_WIDTH },
      });
      map.addLayer({
        id: `${sourceId}-flow`,
        type: "line",
        source: sourceId,
        layout: { visibility: "none" },
        paint: {
          "line-color": CASING,
          "line-width": OUTLINE_WIDTH,
          "line-dasharray": DASH_SEQUENCE[0],
        },
      });
    }
  }
}

// Only ever zooms IN, never out: a layer whose own extent is wider than the
// current view (e.g. Zone Boundaries' district-wide polygon) must not yank
// the user out to it.
//
// The extent comes from the layer's `static_overlays` row rather than from
// its geometry, so framing a layer costs nothing and doesn't have to wait on
// — or even look at — the file itself.
function flyToIfCloser(map: MapLibreMap, bounds: LngLatBoundsLike | undefined) {
  if (!bounds) return;
  const fitOptions = { padding: 60, maxZoom: 17 };
  const camera = map.cameraForBounds(bounds, fitOptions);
  if (camera?.zoom != null && camera.zoom > map.getZoom()) {
    map.fitBounds(bounds, fitOptions);
  }
}

function overlayLayerIds(kind: OverlayDef["kind"], sourceId: string) {
  if (kind === "line") return [`${sourceId}-casing`, `${sourceId}-line`, `${sourceId}-flow`];
  if (kind === "point") return [`${sourceId}-circle`];
  return [`${sourceId}-fill`, `${sourceId}-outline`, `${sourceId}-flow`];
}

/**
 * Drives the looping dash animation on the flow layers, and returns a stop
 * function. Time-based rather than frame-counted, so the loop runs at the same
 * speed on any display refresh rate, and the paint property is only touched
 * when the frame index actually changes — at 65ms a step that is roughly every
 * fourth animation frame on a 60Hz screen.
 */
function startDashAnimation(map: MapLibreMap, defs: OverlayDef[]): () => void {
  const layerIds = flowLayerIds(defs);
  let frame = 0;
  let lastStep = -1;

  function tick(timestamp: number) {
    const step = Math.floor(timestamp / DASH_STEP_MS) % DASH_SEQUENCE.length;
    if (step !== lastStep) {
      lastStep = step;
      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, "line-dasharray", DASH_SEQUENCE[step]);
        }
      }
    }
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function render(map: MapLibreMap, data: LayerCollection, fitOnce: { done: boolean }) {
  const polygons = byGeometryType(data, POLYGON_TYPES);
  const lines = byGeometryType(data, LINE_TYPES);
  const points = byGeometryType(data, POINT_TYPES);

  const polygonsSource = map.getSource<GeoJSONSource>("polygons");
  const linesSource = map.getSource<GeoJSONSource>("lines");
  const pointsSource = map.getSource<GeoJSONSource>("points");

  if (polygonsSource && linesSource && pointsSource) {
    polygonsSource.setData(polygons);
    linesSource.setData(lines);
    pointsSource.setData(points);
  } else {
    addLayers(map, polygons, lines, points);
  }

  if (!fitOnce.done) {
    const bounds = data.features.map(boundsOfFeature).find(Boolean);
    if (bounds) {
      map.fitBounds(bounds, { padding: 40, animate: false });
      fitOnce.done = true;
    }
  }
}

export default function Map({
  data,
  visibility,
  onReady,
  rasterOverlays = EMPTY_RASTERS,
  overlays,
  overlayDefs = [],
  basemap = DEFAULT_BASEMAP,
}: {
  data: LayerCollection;
  visibility: Record<number, boolean>;
  onReady?: (map: MapLibreMap) => void;
  /** Raster themes currently switched on. Several may be on at once. */
  rasterOverlays?: RasterOverlay[];
  overlays?: Record<string, boolean>;
  /** Vector static-overlay defs (key/color/kind), derived from the API's overlay metadata. */
  overlayDefs?: OverlayDef[];
  /** Which basemap is active. See lib/basemaps.ts. */
  basemap?: BasemapId;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const dataRef = useRef(data);
  // Read inside the mount effect's "load" handler, which only ever runs with
  // the overlayDefs captured at mount time otherwise — the metadata fetch
  // that populates this typically resolves after that.
  const overlayDefsRef = useRef(overlayDefs);
  const fitOnceRef = useRef({ done: false });
  const popupRef = useRef<Popup | null>(null);
  const attributionRef = useRef<CompactAttribution | null>(null);
  // Raster theme id → the image URL currently loaded for it, so the effect
  // below can tell "already on, same year" from "already on, year changed"
  // and only swap the texture when it actually has to.
  //
  // A plain record rather than a Map: this module's own default export is
  // named `Map`, so the global constructor is not reachable by that name here.
  const liveRastersRef = useRef<Record<string, string>>({});
  // Read by the mount effect, which must build the initial style with
  // whatever basemap is selected *now*. It is deliberately not a dependency
  // of that effect — a change is applied by the visibility effect below,
  // which does not rebuild the map.
  const basemapRef = useRef(basemap);
  // Keys whose file has been handed to MapLibre. The geometry itself lives in
  // the worker from then on, so there is nothing to cache here beyond the
  // fact that we already asked for it.
  const loadedKeysRef = useRef<Set<string>>(new Set());
  // Keys currently visible, so a fresh off→on transition can be told apart
  // from "still on from last render" — the latter must not re-fly the camera
  // every time some *other* overlay's switch flips (this effect reruns on
  // any overlays change).
  const shownKeysRef = useRef<Set<string>>(new Set());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingOverlays, setLoadingOverlays] = useState<Set<string>>(new Set());
  // Seeded from the reduced-motion media query and then kept in sync with it,
  // so turning the OS setting on stops the loop without a reload. Safe to read
  // during the initial render: this component is only ever loaded client-side
  // (dynamic(..., { ssr: false }) in MapDashboard).
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    overlayDefsRef.current = overlayDefs;
  }, [overlayDefs]);

  useEffect(() => {
    basemapRef.current = basemap;
  }, [basemap]);

  // map lifecycle: create once, tear down on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle(basemapRef.current),
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;

    const attribution = new CompactAttribution(basemapById(basemapRef.current).attribution);
    attributionRef.current = attribution;
    // bottom-right: the map controls dock bottom-left, so sharing that corner
    // would stack the attribution button on top of them.
    map.addControl(attribution, "bottom-right");

    map.on("load", () => {
      render(map, dataRef.current, fitOnceRef.current);
      addOverlaySources(map, overlayDefsRef.current);
      popupRef.current = attachPopups(map, overlayDefsRef);
      setMapLoaded(true);
      onReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data updates: push into the already-running map without recreating it
  useEffect(() => {
    const map = mapRef.current;
    if (map && mapLoaded) render(map, data, fitOnceRef.current);
  }, [data, mapLoaded]);

  // Basemap switch. Pure layout visibility over layers that are all already
  // in the style, so nothing the dashboard has added is disturbed —
  // map.setStyle() would drop every overlay source, every loaded geometry and
  // the raster image layer, and they would all have to be rebuilt.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const shown = new Set(basemapById(basemap).layers);
    for (const layerId of BASEMAP_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", shown.has(layerId) ? "visible" : "none");
      }
    }
    // Esri and OpenStreetMap require different credits, and only the visible
    // one may be shown.
    attributionRef.current?.setHTML(basemapById(basemap).attribution);
  }, [basemap, mapLoaded]);

  // Raster themes. An image source needs a real image up front (a geojson
  // source has an "empty" state, an image source does not), so these are
  // added and removed wholesale rather than kept around hidden like the
  // vector overlays.
  //
  // Any number can be on at once, so this reconciles the live set against the
  // requested one: drop what has gone, add what is new, and re-point a source
  // whose URL changed (that is a year change on a theme that is already on —
  // updateImage swaps the texture without the layer ever leaving the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const live = liveRastersRef.current;
    const wanted = new Set(rasterOverlays.map((r) => r.id));

    for (const id of Object.keys(live)) {
      if (wanted.has(id)) continue;
      if (map.getLayer(rasterLayerId(id))) map.removeLayer(rasterLayerId(id));
      if (map.getSource(rasterSourceId(id))) map.removeSource(rasterSourceId(id));
      delete live[id];
    }

    for (const raster of rasterOverlays) {
      const sourceId = rasterSourceId(raster.id);
      const layerId = rasterLayerId(raster.id);
      const existing = map.getSource<ImageSource>(sourceId);

      if (existing) {
        if (live[raster.id] !== raster.url) {
          existing.updateImage({ url: raster.url, coordinates: imageCoordinates(raster.bounds) });
        }
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, "raster-opacity", raster.opacity);
        }
      } else {
        map.addSource(sourceId, {
          type: "image",
          url: raster.url,
          coordinates: imageCoordinates(raster.bounds),
        });
        // beforeId, so imagery can never cover the vector geometry —
        // see firstVectorLayerId.
        map.addLayer(
          {
            id: layerId,
            type: "raster",
            source: sourceId,
            paint: { "raster-opacity": raster.opacity },
          },
          firstVectorLayerId(map),
        );
      }

      live[raster.id] = raster.url;
    }
  }, [rasterOverlays, mapLoaded]);

  // The overlay-metadata fetch (MapDashboard's fetchOverlays) typically lands
  // after the map's own "load" event, so a def arriving later than mount
  // still needs its source/layers created — addOverlaySources no-ops for any
  // key already present.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    addOverlaySources(map, overlayDefs);
  }, [overlayDefs, mapLoaded]);

  // static overlays: each file is handed to MapLibre once, as a URL rather
  // than as parsed GeoJSON. That hands the fetch, the JSON parse and the
  // tile indexing to MapLibre's own worker, so none of it runs on the main
  // thread — which for files this size (Streams and Watersheds are tens of
  // megabytes, the tree survey far more) is the difference between a switch
  // that responds and a tab that locks up until the parse finishes.
  //
  // After that first load a switch is pure layout visibility: cheap, and
  // immune to rapid on/off clicking. Flies to the layer's extent on every
  // off→on transition (not just the first) — see flyToIfCloser — so
  // switching a layer back on always takes you back to where it actually is.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !overlays) return;

    for (const def of overlayDefs) {
      const sourceId = `overlay-${def.key}`;
      const source = map.getSource<GeoJSONSource>(sourceId);
      if (!source) continue;

      const visible = Boolean(overlays[def.key]);
      const justShown = visible && !shownKeysRef.current.has(def.key);

      if (visible && !loadedKeysRef.current.has(def.key)) {
        // Marked before the load rather than after, so a re-render mid-load
        // doesn't start the same fetch a second time.
        loadedKeysRef.current.add(def.key);
        setLoadingOverlays((s) => new Set(s).add(def.key));
        source
          .setData(def.url, true)
          .catch(() => {
            // Forget it, so flipping the switch off and on retries rather
            // than leaving the layer permanently empty.
            loadedKeysRef.current.delete(def.key);
          })
          .finally(() => {
            setLoadingOverlays((s) => {
              const next = new Set(s);
              next.delete(def.key);
              return next;
            });
          });
      }

      // Framed from the seeded extent, so the camera moves the instant the
      // switch is flipped rather than after the geometry has arrived.
      if (justShown) flyToIfCloser(map, def.bounds);

      if (visible) shownKeysRef.current.add(def.key);
      else shownKeysRef.current.delete(def.key);

      for (const layerId of overlayLayerIds(def.kind, sourceId)) {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  }, [overlays, overlayDefs, mapLoaded]);

  // visibility toggles: filter, never re-fetch or refit. No layer is
  // selected by default, so this shows only ids explicitly switched on
  // rather than hiding ids explicitly switched off.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const visibleIds = Object.entries(visibility)
      .filter(([, visible]) => visible)
      .map(([id]) => Number(id));
    const filter: FilterSpecification = ["in", ["get", "id"], ["literal", visibleIds]];
    for (const layerId of ["polygons-fill", "polygons-outline", "lines-casing", "lines", "points"]) {
      if (map.getLayer(layerId)) map.setFilter(layerId, filter);
    }
    // An open attribute popup is a DOM overlay, not a styled layer, so
    // filtering the feature out can't hide it — switching a layer off would
    // otherwise leave its popup floating over nothing.
    popupRef.current?.remove();
  }, [visibility, mapLoaded]);

  useEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The dash loop runs only while a reference layer is actually on screen — an
  // rAF loop repainting the map behind nothing would be pure waste. Honouring
  // prefers-reduced-motion leaves the dashes in place but static, so the layers
  // still look the same, just without the movement.
  const overlaysOnCount = Object.values(overlays ?? {}).filter(Boolean).length;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || overlaysOnCount === 0 || reducedMotion) return;
    return startDashAnimation(map, overlayDefs);
  }, [mapLoaded, overlaysOnCount, reducedMotion, overlayDefs]);

  return (
    <div className="absolute inset-0">
      {/* MapLibre stamps its own position:relative onto this node, which
          would override an absolute/inset sizing class in the cascade —
          percentage sizing sidesteps that fight. */}
      <div ref={containerRef} className="size-full" />
      <MapControls
        mapRef={mapRef}
        fitBounds={() => {
          const map = mapRef.current;
          const bounds = dataRef.current.features.map(boundsOfFeature).find(Boolean);
          if (map && bounds) map.fitBounds(bounds, { padding: 40 });
          else map?.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
        }}
      />

      {/* Bottom-centre, between the basemap switcher on the left and the
          legend card on the right. */}
      <CoordinateReadout
        mapRef={mapRef}
        mapLoaded={mapLoaded}
        className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 md:block"
      />

      {!mapLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" strokeWidth={1.75} />
        </div>
      )}

      {mapLoaded && loadingOverlays.size > 0 && (
        <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm text-foreground shadow-e2 ring-1 ring-foreground/10">
          <Loader2 className="size-4 animate-spin text-primary" strokeWidth={1.75} />
          Loading layer…
        </div>
      )}
    </div>
  );
}

export type { LayerFeature };
