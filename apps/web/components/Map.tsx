"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, LngLatBounds, type LngLatBoundsLike, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const POLYGON_TYPES = new Set(["Polygon", "MultiPolygon"]);
const LINE_TYPES = new Set(["LineString", "MultiLineString"]);

// blank canvas — no basemap tiles, just the GeoJSON we render on top
const BLANK_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#e5e5e5" },
    },
  ],
};

function byGeometryType(
  data: GeoJSON.FeatureCollection,
  types: Set<string>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: data.features.filter((f) => types.has(f.geometry.type)),
  };
}

function boundsOf(data: GeoJSON.FeatureCollection): LngLatBoundsLike | null {
  const bounds = new LngLatBounds();
  let hasPoint = false;

  function walk(coords: unknown): void {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      bounds.extend(coords as [number, number]);
      hasPoint = true;
    } else if (Array.isArray(coords)) {
      coords.forEach(walk);
    }
  }

  for (const feature of data.features) {
    walk(feature.geometry.type === "GeometryCollection" ? [] : (feature.geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates);
  }

  return hasPoint ? bounds : null;
}

function render(map: MapLibreMap, data: GeoJSON.FeatureCollection) {
  const polygons = byGeometryType(data, POLYGON_TYPES);
  const lines = byGeometryType(data, LINE_TYPES);

  const polygonsSource = map.getSource<GeoJSONSource>("polygons");
  const linesSource = map.getSource<GeoJSONSource>("lines");

  if (polygonsSource && linesSource) {
    polygonsSource.setData(polygons);
    linesSource.setData(lines);
  } else {
    map.addSource("polygons", { type: "geojson", data: polygons });
    map.addSource("lines", { type: "geojson", data: lines });

    map.addLayer({
      id: "polygons-fill",
      type: "fill",
      source: "polygons",
      paint: { "fill-color": "#3b82f6", "fill-opacity": 0.25 },
    });
    map.addLayer({
      id: "polygons-outline",
      type: "line",
      source: "polygons",
      paint: { "line-color": "#3b82f6", "line-width": 2 },
    });
    map.addLayer({
      id: "lines",
      type: "line",
      source: "lines",
      paint: {
        "line-color": [
          "match",
          ["get", "name"],
          "roads",
          "#f59e0b",
          "metro_train",
          "#ef4444",
          "#6b7280",
        ],
        "line-width": 3,
      },
    });
  }

  const bounds = boundsOf(data);
  if (bounds) map.fitBounds(bounds, { padding: 40, animate: false });
}

export default function Map({ data }: { data: GeoJSON.FeatureCollection }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // map lifecycle: create once, tear down on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [72.5714, 23.0225], // Ahmedabad
      zoom: 11,
    });
    mapRef.current = map;
    map.on("load", () => render(map, dataRef.current));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // data updates: push into the already-running map without recreating it
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) render(map, data);
  }, [data]);

  return <div ref={containerRef} className="flex-1" />;
}
