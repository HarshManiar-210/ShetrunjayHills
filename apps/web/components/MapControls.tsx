"use client";

import type { RefObject } from "react";
import { Plus, Minus, House, LocateFixed, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Map as MapLibreMap } from "maplibre-gl";

export function MapControls({
  mapRef,
  fitBounds,
  onToggleLayers,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  fitBounds: () => void;
  onToggleLayers?: () => void;
}) {
  function locate() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13 });
    });
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-xl bg-card p-1 shadow-sm ring-1 ring-foreground/10">
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
      <Button variant="ghost" size="icon-sm" aria-label="Locate me" onClick={locate}>
        <LocateFixed />
      </Button>
      {onToggleLayers && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle layers panel"
          onClick={onToggleLayers}
        >
          <Layers />
        </Button>
      )}
    </div>
  );
}
