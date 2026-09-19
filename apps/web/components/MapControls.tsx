"use client";

import type { RefObject } from "react";
import { Plus, Minus, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Map as MapLibreMap } from "maplibre-gl";

// Zoom in, zoom out and reset-to-extent only. "Locate me" pointed a
// geolocation prompt at a study area a user is almost never standing in, and
// the layers button duplicated the header's menu toggle, which is on screen
// at every breakpoint the map controls are.
//
// Docked top-right: the brief puts the layers panel on the left and the map
// tools on the right. The basemap switcher moved to the bottom-left corner
// these vacated.
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
      className="absolute top-3 right-3 z-10 flex flex-col gap-1 rounded-xl bg-card/95 p-1 shadow-e2 ring-1 ring-foreground/10 backdrop-blur-sm"
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
