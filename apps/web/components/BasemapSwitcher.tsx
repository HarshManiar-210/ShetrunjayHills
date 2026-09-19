"use client";

import { Check } from "lucide-react";
import { BASEMAPS, type BasemapId } from "@/lib/basemaps";
import { cn } from "@/lib/utils";

/**
 * Basemap picker — one swatch per basemap, each showing a real tile of the
 * study area so the choice previews itself rather than relying on a label.
 *
 * Floats over the map; the caller supplies the positioning.
 */
export function BasemapSwitcher({
  value,
  onChange,
  className,
}: {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
  className?: string;
}) {
  return (
    <div
      data-tour="basemap"
      role="radiogroup"
      aria-label="Basemap"
      className={cn(
        "flex gap-1.5 rounded-xl bg-card/95 p-1.5 shadow-e2 ring-1 ring-foreground/10 backdrop-blur-sm",
        className,
      )}
    >
      {BASEMAPS.map((basemap) => {
        const active = basemap.id === value;
        return (
          <button
            key={basemap.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={basemap.label}
            onClick={() => onChange(basemap.id)}
            className={cn(
              "group relative size-14 shrink-0 overflow-hidden rounded-lg ring-1 transition-all",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              active
                ? "ring-2 ring-primary"
                : "opacity-70 ring-foreground/15 hover:opacity-100 hover:ring-foreground/30",
            )}
          >
            {/* A plain <img> rather than next/image: these are third-party
                tile URLs whose hosts would each need whitelisting in
                next.config, for a 256px thumbnail that gains nothing from
                the optimiser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={basemap.thumbnail}
              alt=""
              aria-hidden
              loading="lazy"
              className="size-full object-cover"
            />

            {/* Scrim: the label has to stay readable over imagery that runs
                from near-black water to bright scrub. */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent pt-3 pb-0.5"
            >
              <span className="block truncate px-1 text-[9px] leading-tight font-medium tracking-wide text-white">
                {basemap.label}
              </span>
            </span>

            {active && (
              <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
