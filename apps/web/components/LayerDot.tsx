import { legendDot, legendFor } from "@/lib/legend-config";
import { cn } from "@/lib/utils";

/**
 * A layer's colour, as a dot.
 *
 * Both layer lists — the navbar's layer dropdown and the map's layers panel —
 * lead each row with this instead of a shape icon. The icons said what kind
 * of geometry a layer was, which is rarely the question; the colour is, since
 * that is what the eye has to match between the row and the map.
 *
 * A vector layer has one colour. A raster theme has a palette, so the dot
 * takes whatever stands for it — see legendDot.
 */
export function LayerDot({
  color,
  raster,
  faded,
  className,
}: {
  /** A vector layer's own colour, when it has one. */
  color?: string;
  /** The raster theme this row is, when it is one. Its id keys the palette. */
  raster?: { id: string };
  /** Dimmed, for a layer with no data delivered. */
  faded?: boolean;
  className?: string;
}) {
  const dot = color
    ? ({ kind: "solid", color } as const)
    : legendDot(raster ? legendFor(raster.id) : undefined);

  // The ring keeps both ends of the range readable: a near-black class on the
  // dark panel, and a near-white one like Green Cover's Non-Forest.
  const shape = cn(
    "size-2 shrink-0 rounded-full ring-1 ring-foreground/20",
    faded && "opacity-40",
    className,
  );

  if (dot.kind === "none") {
    return <span aria-hidden className={cn(shape, "bg-muted-foreground/40")} />;
  }

  const background =
    dot.kind === "solid"
      ? dot.color
      : // Hard stops, as the gradient bar uses: the imagery is classified, so
        // a blend would show colours the map does not contain.
        `linear-gradient(135deg, ${dot.colors
          .map((c, i, all) => `${c} ${(i / all.length) * 100}%, ${c} ${((i + 1) / all.length) * 100}%`)
          .join(", ")})`;

  return <span aria-hidden className={shape} style={{ background }} />;
}
