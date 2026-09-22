"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Plus, Minus, House, Ruler, Shapes, LocateFixed, Loader2 } from "lucide-react";
import { Marker, type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MeasureMode } from "@/components/MeasureTool";
import {
  circleRing,
  describeFix,
  zoomForAccuracy,
  COARSE_FIX_M,
  GOOD_FIX_M,
} from "@/lib/locate";
import { cn } from "@/lib/utils";

const ACCURACY_SOURCE = "locate-accuracy";
const ACCURACY_FILL = "locate-accuracy-fill";
const ACCURACY_LINE = "locate-accuracy-line";

/**
 * How long to keep listening for a better fix.
 *
 * A single getCurrentPosition call takes the first answer the device gives,
 * which on a phone is usually the coarse network one — GPS arrives a few
 * seconds later. Watching for a while and keeping the best answer is the one
 * thing here that genuinely improves accuracy rather than just reporting it.
 */
const SETTLE_MS = 12_000;

/**
 * The map's tool stack.
 *
 * Bottom-right: still the right-hand side the brief asks for, but down in the
 * corner so the top of that edge belongs entirely to the Legend and Statistics
 * cards — side by side they crowded each other.
 *
 * Measure Distance, Measure Area and Show Location are all from the brief.
 * Show Location had previously been removed on the grounds that it points a
 * geolocation prompt at a study area nobody is standing in; the client asked
 * for it back, so it is back — it just reports honestly when the browser
 * cannot place you.
 */
export function MapControls({
  mapRef,
  fitBounds,
  measureMode,
  onMeasureModeChange,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  fitBounds: () => void;
  measureMode: MeasureMode;
  onMeasureModeChange: (mode: MeasureMode) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [fix, setFix] = useState<{ accuracy: number } | null>(null);

  const watchRef = useRef<number | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Best accuracy seen in this run, so a later, worse reading cannot drag the
  // pin back off the good fix that preceded it.
  const bestRef = useRef(Infinity);

  const stopWatching = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (settleRef.current !== null) {
      clearTimeout(settleRef.current);
      settleRef.current = null;
    }
    setLocating(false);
  }, []);

  // A watch left running after the tool stack unmounts keeps the device's
  // radio awake for a map nobody is looking at.
  useEffect(() => stopWatching, [stopWatching]);

  function showLocation() {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      setLocateError("This browser cannot report a location.");
      return;
    }

    stopWatching();
    setLocating(true);
    setLocateError(null);
    setFix(null);
    bestRef.current = Infinity;

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const accuracy = coords.accuracy || 0;
        // Readings arrive out of order of quality; only act on an improvement.
        if (accuracy > bestRef.current) return;
        bestRef.current = accuracy;

        const at: [number, number] = [coords.longitude, coords.latitude];
        setFix({ accuracy });

        // One marker at a time: asking again should move the pin, not add one.
        locationMarker?.remove();
        locationMarker = new Marker({ color: "#F5C542" }).setLngLat(at).addTo(map);
        drawAccuracy(map, at, accuracy);

        map.flyTo({ center: at, zoom: zoomForAccuracy(accuracy, coords.latitude) });

        // Precise enough that waiting longer would only cost battery.
        if (accuracy <= GOOD_FIX_M) stopWatching();
      },
      (err) => {
        stopWatching();
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was declined."
            : "Could not get a location fix.",
        );
      },
      { enableHighAccuracy: true, timeout: SETTLE_MS, maximumAge: 0 },
    );

    // Whatever the best reading was by now is the answer; a watch left open
    // past this is listening for a GPS lock that is not coming.
    settleRef.current = setTimeout(stopWatching, SETTLE_MS);
  }

  const locateLabel = locateError
    ? locateError
    : locating
      ? "Finding your location…"
      : fix
        ? describeFix(fix.accuracy)
        : "Show my location";

  function toggleMeasure(mode: Exclude<MeasureMode, null>) {
    onMeasureModeChange(measureMode === mode ? null : mode);
  }

  return (
    <div
      data-tour="map-controls"
      className="absolute right-3 bottom-3 z-10 flex flex-col gap-1 rounded-xl bg-card/95 p-1 shadow-e2 ring-1 ring-foreground/10 backdrop-blur-sm"
    >
      <ToolButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
        <Plus />
      </ToolButton>
      <ToolButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
        <Minus />
      </ToolButton>
      <ToolButton label="Reset view" onClick={fitBounds}>
        <House />
      </ToolButton>

      <span className="mx-1 my-0.5 border-t border-border/70" aria-hidden />

      <ToolButton
        label="Measure distance"
        pressed={measureMode === "distance"}
        onClick={() => toggleMeasure("distance")}
      >
        <Ruler />
      </ToolButton>
      <ToolButton
        label="Measure area"
        pressed={measureMode === "area"}
        onClick={() => toggleMeasure("area")}
      >
        <Shapes />
      </ToolButton>
      <ToolButton
        label={locateLabel}
        onClick={showLocation}
        disabled={locating}
        // A coarse fix is not a failure, but it should not look like a lock
        // either — the tooltip explains, and the tint says to read it.
        className={
          fix && fix.accuracy > COARSE_FIX_M && !locating ? "text-brand" : undefined
        }
      >
        {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
      </ToolButton>
    </div>
  );
}

/**
 * The reported accuracy, drawn on the ground around the pin.
 *
 * Without it the pin claims a precision the browser never offered: a desktop
 * with no GPS answers from Wi-Fi or IP and can be kilometres out, and the map
 * was drawing that with the same confident dot as a GPS lock. The circle is a
 * polygon rather than a circle layer because MapLibre sizes those in screen
 * pixels, which would say nothing about ground distance.
 */
function drawAccuracy(map: MapLibreMap, center: [number, number], radiusMetres: number) {
  const data: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [circleRing(center, Math.max(radiusMetres, 1))] },
  };

  const existing = map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(ACCURACY_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: ACCURACY_FILL,
    type: "fill",
    source: ACCURACY_SOURCE,
    paint: { "fill-color": "#F5C542", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: ACCURACY_LINE,
    type: "line",
    source: ACCURACY_SOURCE,
    paint: { "line-color": "#F5C542", "line-width": 1.5, "line-opacity": 0.7 },
  });
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            pressed && "bg-primary text-primary-foreground hover:bg-primary/90",
            className,
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Module-scoped rather than a ref: there is one map and one "you are here"
 * pin, and keeping it here means the marker survives this component
 * re-rendering without threading a ref through for a single pin.
 */
let locationMarker: Marker | null = null;
