/**
 * The legend's shape vocabulary, which the brief spells out: rasters as solid
 * colour blocks, points as dots, lines as lines, hollow polygons as outlines
 * only, and filled polygons as solid colour or a pattern. A swatch therefore
 * has to say *how* a layer draws, not just what geometry it holds — which is
 * why this mirrors static_overlays.kind rather than the GeoJSON geometry type.
 *
 * Each swatch is built to look like what the map actually paints (see
 * Map.tsx): a raster class is opaque pixels, a filled polygon is a wash with
 * a solid edge over them, a hollow polygon is the edge alone, a line has the
 * width it draws at, and a point is a disc.
 */
export type SwatchGeometryKind =
  | "point"
  | "line"
  | "dotted-line"
  | "polygon"
  | "polygon-outline"
  | "raster";

/**
 * How strongly a filled polygon's wash reads in its swatch.
 *
 * The map draws these at 0.15–0.25 fill opacity so the imagery stays visible
 * underneath. At 10px a 15% wash is invisible, so the swatch overstates it —
 * enough to be seen, still clearly not the opaque block a raster class gets.
 */
const FILL_WASH = "32%";

export function LayerSwatch({
  color,
  geometryKind,
}: {
  color: string;
  geometryKind: SwatchGeometryKind;
}) {
  if (geometryKind === "point") {
    return (
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    );
  }

  if (geometryKind === "line") {
    return (
      <span
        className="h-0.5 w-4 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    );
  }

  if (geometryKind === "dotted-line") {
    return (
      <span
        className="w-4 shrink-0 border-t-2 border-dotted"
        style={{ borderColor: color }}
        aria-hidden
      />
    );
  }

  // A boundary layer: the outline is the whole of what draws on the map, so
  // the swatch shows an outline and nothing inside it.
  if (geometryKind === "polygon-outline") {
    return (
      <span
        className="size-2.5 shrink-0 rounded-[2px] border-[1.5px]"
        style={{ borderColor: color }}
        aria-hidden
      />
    );
  }

  // A filled polygon: a wash inside a solid edge, which is how the map paints
  // it. Drawn as an opaque block it was indistinguishable from a raster
  // class, so a legend carrying both Forest Boundary and Forest Cover's Open
  // Forest showed the same green square twice with nothing to tell them
  // apart.
  if (geometryKind === "polygon") {
    return (
      <span
        className="size-2.5 shrink-0 rounded-[2px] border-[1.5px]"
        style={{
          borderColor: color,
          backgroundColor: `color-mix(in srgb, ${color} ${FILL_WASH}, transparent)`,
        }}
        aria-hidden
      />
    );
  }

  // A raster class: opaque pixels, so an opaque block.
  return (
    <span
      className="size-2.5 shrink-0 rounded-[2px]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
