"use client";

import { useEffect, useState, type RefObject } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatArea,
  formatDistance,
  pathLengthMetres,
  ringAreaSqMetres,
  type Position,
} from "@/lib/measure";
import { cn } from "@/lib/utils";

export type MeasureMode = "distance" | "area" | null;

const SOURCE = "measure";
const FILL_LAYER = "measure-fill";
const LINE_LAYER = "measure-line";
const POINT_LAYER = "measure-points";

/** Deliberately not a data colour — a measurement is annotation, not a layer. */
const MEASURE_COLOR = "#F5C542";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Builds what the measurement draws: the committed vertices, plus a rubber-band
 * segment out to wherever the cursor is, so the next click's effect is visible
 * before it is made.
 */
function measureGeoJSON(
  points: Position[],
  hover: Position | null,
  mode: Exclude<MeasureMode, null>,
): GeoJSON.FeatureCollection {
  const path = hover ? [...points, hover] : points;
  const features: GeoJSON.Feature[] = points.map((p) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: p },
  }));

  if (path.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        // An area closes back to the start; a distance does not.
        coordinates: mode === "area" ? [...path, path[0]] : path,
      },
    });
  }

  if (mode === "area" && path.length >= 3) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...path, path[0]]] },
    });
  }

  return { type: "FeatureCollection", features };
}

function addMeasureLayers(map: MapLibreMap) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, { type: "geojson", data: EMPTY });

  map.addLayer({
    id: FILL_LAYER,
    type: "fill",
    source: SOURCE,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": MEASURE_COLOR, "fill-opacity": 0.18 },
  });
  map.addLayer({
    id: LINE_LAYER,
    type: "line",
    source: SOURCE,
    filter: ["==", ["geometry-type"], "LineString"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": MEASURE_COLOR, "line-width": 2, "line-dasharray": [2, 1] },
  });
  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: SOURCE,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": MEASURE_COLOR,
      "circle-radius": 4,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#1C1C1B",
    },
  });
}

/**
 * Measure Distance and Measure Area, per the brief.
 *
 * Click to drop vertices; double-click, Enter or Escape finishes. Everything
 * it draws lives in one geojson source filtered three ways by geometry type,
 * so a single setData call updates the shape, its outline and its vertices
 * together.
 *
 * Measuring suppresses the feature popup for as long as it is active — see
 * the `measuring` ref threaded into Map's click handler — because a click
 * while measuring means "add a vertex", not "identify what is underneath".
 */
export function MeasureTool({
  mapRef,
  mapLoaded,
  mode,
  onExit,
  measuringRef,
  className,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  mapLoaded: boolean;
  mode: MeasureMode;
  onExit: () => void;
  /** Read by Map's popup handler so a measuring click doesn't also identify. */
  measuringRef: RefObject<boolean>;
  className?: string;
}) {
  // Reset between measurements comes from the parent keying this component on
  // `mode`, so switching tools remounts it with empty state — rather than an
  // effect that clears state after the fact.
  const [points, setPoints] = useState<Position[]>([]);
  const [hover, setHover] = useState<Position | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    measuringRef.current = mode !== null;
  }, [mode, measuringRef]);

  // Bind the drawing interactions for as long as a mode is active.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !mode) return;

    addMeasureLayers(map);
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";
    // Otherwise the double-click that ends a measurement also zooms.
    map.doubleClickZoom.disable();

    const onClick = (e: MapMouseEvent) => {
      if (finished) return;
      setPoints((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    };
    const onMove = (e: MapMouseEvent) => {
      if (finished) return;
      setHover([e.lngLat.lng, e.lngLat.lat]);
    };
    const onDoubleClick = () => {
      setFinished(true);
      setHover(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "Enter") {
        setFinished(true);
        setHover(null);
      }
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKey);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.off("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKey);
      canvas.style.cursor = previousCursor;
      map.doubleClickZoom.enable();
    };
    // `finished` is a dependency so the handlers above see the current value.
    // They rebind only when a measurement is completed or cleared, which is
    // rare — the alternative, a ref, cannot be written during render.
  }, [mapRef, mapLoaded, mode, onExit, finished]);

  // Push the current shape into the map, and clear it when the tool closes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource<GeoJSONSource>(SOURCE);
    if (!source) return;
    source.setData(mode ? measureGeoJSON(points, hover, mode) : EMPTY);
  }, [mapRef, mapLoaded, mode, points, hover]);

  if (!mode) return null;

  const path = hover && !finished ? [...points, hover] : points;
  const value =
    mode === "distance"
      ? formatDistance(pathLengthMetres(path))
      : formatArea(ringAreaSqMetres(path));
  const enough = mode === "distance" ? path.length >= 2 : path.length >= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl bg-card/95 px-3 py-2 shadow-e3 ring-1 ring-foreground/10 backdrop-blur-sm",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {mode === "distance" ? "Distance" : "Area"}
        </p>
        <p className="text-sm font-semibold tabular-nums">
          {enough ? value : <span className="text-muted-foreground">Click to start</span>}
        </p>
      </div>

      {!finished && enough && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Finish measuring"
          onClick={() => {
            setFinished(true);
            setHover(null);
          }}
        >
          <Check />
        </Button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear measurement"
        onClick={() => {
          setPoints([]);
          setHover(null);
          setFinished(false);
        }}
      >
        <Trash2 />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Close measuring tool" onClick={onExit}>
        <X />
      </Button>
    </div>
  );
}
