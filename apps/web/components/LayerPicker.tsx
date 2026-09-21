"use client";

import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sectionLayers, type SectionDef, type SectionLayer } from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * The navbar's layer picker: which layers you are working with.
 *
 * Ticking a layer here draws it and puts it in the map's layers panel, which
 * is where it is switched off again, given a year, or faded. The split keeps
 * the panel down to the handful of layers someone is working on instead of
 * all fifty-odd at once, which is what made the old always-complete column a
 * wall to scroll.
 *
 * A group's checkbox reveals its layers and selects none of them. Drone Data
 * is six rasters and Administrative Boundaries ten layers, so a group tick
 * that selected everything would be a heavy accident — and on the raster
 * groups, six full-extent images stacked at once.
 */

export function LayerPicker({
  sections,
  selected,
  onToggleLayer,
  className,
}: {
  sections: SectionDef[];
  /** Toggle key → picked. Independent of what is actually drawing. */
  selected: Record<string, boolean>;
  onToggleLayer: (key: string, picked: boolean) => void;
  className?: string;
}) {
  // Which groups have their layers showing. Purely local: revealing a group
  // changes nothing about the map, so it is not worth lifting.
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const pickedCount = Object.values(selected).filter(Boolean).length;

  function setPicked(layers: SectionLayer[], picked: boolean) {
    for (const layer of layers) {
      if (layer.pending) continue;
      if (Boolean(selected[layer.key]) !== picked) onToggleLayer(layer.key, picked);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-tour="layer-picker"
          className={cn("gap-2", className)}
        >
          <Layers className="size-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Layers</span>
          {pickedCount > 0 && (
            <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold tabular-nums text-brand-foreground">
              {pickedCount}
            </span>
          )}
          <ChevronDown className="size-3.5 opacity-60" strokeWidth={2} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Select layers
          </p>
          <button
            type="button"
            disabled={pickedCount === 0}
            onClick={() => sections.forEach((s) => setPicked(sectionLayers(s), false))}
            className="text-[11px] font-medium text-brand transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
          >
            Clear all
          </button>
        </div>

        <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5 scrollbar-thin">
          {sections.map((section) => {
            const layers = sectionLayers(section);
            const pickedHere = layers.filter((l) => selected[l.key]).length;
            // A group with picks inside it stays open regardless: closing it
            // would hide rows that are in the panel and possibly drawing.
            const open = Boolean(revealed[section.id]) || pickedHere > 0;

            const reveal = (next: boolean) => {
              setRevealed((r) => ({ ...r, [section.id]: next }));
              // Closing a group takes its layers out of the panel with it, so
              // the two controls never disagree about what is in play.
              if (!next) setPicked(layers, false);
            };

            return (
              <div key={section.id} className="mb-0.5">
                <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/5">
                  <Checkbox
                    checked={open}
                    aria-label={`Show the layers in ${section.label}`}
                    onCheckedChange={(next) => reveal(next === true)}
                  />
                  <button
                    type="button"
                    onClick={() => reveal(!open)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <section.icon
                      className="size-3.5 shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {section.label}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {pickedHere > 0 ? `${pickedHere}/${layers.length}` : layers.length}
                    </span>
                  </button>
                </div>

                {open && (
                  <div className="mb-1 ml-3.5 border-l border-border/70 pl-2">
                    {layers.map((layer) =>
                      layer.pending ? (
                        <div
                          key={layer.key}
                          className="flex items-center gap-2.5 px-2 py-1.5 text-[13px]"
                        >
                          <Checkbox checked={false} disabled aria-hidden tabIndex={-1} />
                          <layer.icon
                            className="size-3.5 shrink-0 text-muted-foreground/40"
                            strokeWidth={2}
                          />
                          <span className="min-w-0 flex-1 truncate text-muted-foreground/50">
                            {layer.label}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium text-brand/70">
                            Coming soon
                          </span>
                        </div>
                      ) : (
                        <label
                          key={layer.key}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-foreground/5"
                        >
                          <Checkbox
                            checked={Boolean(selected[layer.key])}
                            onCheckedChange={(next) => onToggleLayer(layer.key, next === true)}
                          />
                          {/* Tinted to the colour it draws in, so the picker
                              already reads as a key to the map. */}
                          <layer.icon
                            className={cn("size-3.5 shrink-0", !layer.color && "text-muted-foreground")}
                            style={layer.color ? { color: layer.color } : undefined}
                            strokeWidth={2}
                          />
                          <span className="min-w-0 flex-1 truncate">{layer.label}</span>
                        </label>
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="border-t border-border px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          Selected layers draw on the map and appear in its layers panel.
        </p>
      </PopoverContent>
    </Popover>
  );
}
