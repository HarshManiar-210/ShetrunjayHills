"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cn } from "@/lib/utils";

/**
 * Live position, bottom-centre of the map — always showing a value.
 *
 * Under the pointer while it is over the map; the map centre otherwise (the
 * pointer has left, or it is a touch device with no hover), following the
 * map as it pans. So the pill is never empty and never stale.
 *
 * Latitude and longitude only. The brief is explicit that the EPSG code and
 * the zoom level are not wanted here — the earlier mockups showed all four and
 * the client asked for the other two to go.
 *
 * Driven by map event subscriptions rather than React state on the map, so
 * nothing above this component re-renders as the pointer moves, and batched
 * to one update per animation frame so this component does not re-render at
 * the raw mousemove rate either.
 */
export function CoordinateReadout({
  mapRef,
  mapLoaded,
  className,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  /** Gates the subscription — the map instance does not exist before this. */
  mapLoaded: boolean;
  className?: string;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let pointerOver = false;
    let frame = 0;
    let next: { lat: number; lng: number } | null = null;
    const show = (at: { lat: number; lng: number }) => {
      next = { lat: at.lat, lng: at.lng };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setPosition(next);
      });
    };

    const onMove = (e: { lngLat: { lat: number; lng: number } }) => {
      pointerOver = true;
      show(e.lngLat);
    };
    const onLeave = () => {
      pointerOver = false;
      show(map.getCenter());
    };
    // Panning or zooming with the pointer off the map (keyboard, the tool
    // stack, a search fly-to, a touch drag) moves the centre under the pill.
    const onCameraMove = () => {
      if (!pointerOver) show(map.getCenter());
    };

    // Filled straight away with where the map is looking, not left blank
    // until the pointer first moves.
    show(map.getCenter());
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    map.on("move", onCameraMove);
    return () => {
      cancelAnimationFrame(frame);
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
      map.off("move", onCameraMove);
    };
  }, [mapRef, mapLoaded]);

  return (
    <div
      className={cn(
        "pointer-events-none rounded-full bg-card/95 px-3 py-1.5 shadow-e2 ring-1 ring-foreground/10 backdrop-blur-sm",
        // Hidden only for the frame before the map has loaded, holding its
        // place in the bottom stack so nothing below it shifts.
        !position && "invisible",
        className,
      )}
    >
      {/* Tabular figures and a fixed 4-decimal format, so the pill holds one
          width instead of jittering as the digits change under the pointer. */}
      <p className="font-mono text-[11px] tracking-tight whitespace-nowrap tabular-nums">
        {position ? (
          <>
            <span className="text-muted-foreground">Lat</span>{" "}
            <span className="text-foreground">{position.lat.toFixed(4)}</span>
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">Lng</span>{" "}
            <span className="text-foreground">{position.lng.toFixed(4)}</span>
          </>
        ) : (
          // Sized like a reading so the not-yet-filled pill holds the same space.
          <span aria-hidden>Lat 00.0000 · Lng 00.0000</span>
        )}
      </p>
    </div>
  );
}
