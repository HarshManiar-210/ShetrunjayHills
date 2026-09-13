"use client";

import type { RefObject } from "react";
import { Plus, Minus, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Map as MapLibreMap } from "maplibre-gl";

// Zoom in, zoom out and reset-to-extent only. "Locate me" pointed a
// geolocation prompt at a study area a user is almost never standing in, and
// the layers button duplicated the header's menu toggle, which is on screen
// at every breakpoint the map controls are.
export function MapControls({
  mapRef,
  fitBounds,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  fitBounds: () => void;
}) {
  return (
    <div
      data-tour="map-controls"
      className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-xl bg-card p-1 shadow-e2 ring-1 ring-foreground/10"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        onClick={() => mapRef.current?.zoomIn()}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        onClick={() => mapRef.current?.zoomOut()}
      >
        <Minus />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Reset view" onClick={fitBounds}>
        <House />
      </Button>
    </div>
  );
}
