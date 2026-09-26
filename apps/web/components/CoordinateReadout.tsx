"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cn } from "@/lib/utils";

/** How long the pointer must stay still before its position is shown. */
const DWELL_MS = 1000;

/**
 * Pointer position, bottom-centre of the map.
 *
 * Latitude and longitude only. The brief is explicit that the EPSG code and
 * the zoom level are not wanted here — the earlier mockups showed all four and
 * the client asked for the other two to go.
 *
 * Driven by a `mousemove` subscription rather than React state on the map, so
 * nothing above this component re-renders as the pointer moves.
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

    // Only shown once the pointer has rested on one spot for DWELL_MS: moving
    // hides it again, so it never flickers along behind a pointer in motion.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMove = (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat;
      clearTimeout(timer);
      setPosition(null);
      timer = setTimeout(() => setPosition({ lat, lng }), DWELL_MS);
    };
    // Touch devices have no hover, so the readout would otherwise stay empty
    // and then freeze on wherever was last tapped — clearing on leave keeps it
    // honest about only describing where the pointer actually is.
    const onLeave = () => {
      clearTimeout(timer);
      setPosition(null);
    };

    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    return () => {
      clearTimeout(timer);
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
    };
  }, [mapRef, mapLoaded]);

  return (
    <div
      className={cn(
        "pointer-events-none rounded-full bg-card/95 px-3 py-1.5 shadow-e2 ring-1 ring-foreground/10 backdrop-blur-sm",
        // Hidden, not unmounted, off the map: it keeps its place in the
        // bottom stack, so nothing below it shifts as the pointer comes and goes.
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
          // Sized like a reading so the hidden pill holds the same space.
          <span aria-hidden>Lat 00.0000 · Lng 00.0000</span>
        )}
      </p>
    </div>
  );
}
