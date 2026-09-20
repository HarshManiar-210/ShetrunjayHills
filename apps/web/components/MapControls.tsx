"use client";

import { useState, type RefObject } from "react";
import { Plus, Minus, House, Ruler, Shapes, LocateFixed, Loader2 } from "lucide-react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MeasureMode } from "@/components/MeasureTool";
import { cn } from "@/lib/utils";

/** How far to zoom when someone asks to be shown where they are. */
const LOCATE_ZOOM = 15;

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

  function showLocation() {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      setLocateError("This browser cannot report a location.");
      return;
    }

    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const at: [number, number] = [coords.longitude, coords.latitude];
        // One marker at a time: asking again should move the pin, not add one.
        locationMarker?.remove();
        locationMarker = new Marker({ color: "#F5C542" }).setLngLat(at).addTo(map);
        map.flyTo({ center: at, zoom: Math.max(map.getZoom(), LOCATE_ZOOM) });
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was declined."
            : "Could not get a location fix.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

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
        label={locateError ?? "Show my location"}
        onClick={showLocation}
        disabled={locating}
      >
        {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
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
          className={cn(pressed && "bg-primary text-primary-foreground hover:bg-primary/90")}
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
