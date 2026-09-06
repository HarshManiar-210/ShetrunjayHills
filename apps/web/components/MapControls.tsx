"use client";

import type { RefObject } from "react";
import { Plus, Minus, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Map as MapLibreMap } from "maplibre-gl";

export function MapControls({
  mapRef,
  resetView,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  resetView: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 rounded-xl bg-card p-1 shadow-sm ring-1 ring-foreground/10">
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
      <Button variant="ghost" size="icon-sm" aria-label="Reset view" onClick={resetView}>
        <House />
      </Button>
    </div>
  );
}
