/**
 * The legend's shape vocabulary, which the brief spells out: rasters as solid
 * colour blocks, points as dots, lines as lines, hollow polygons as outlines
 * only, and filled polygons as solid colour. A swatch therefore has to say
 * *how* a layer draws, not just what geometry it holds — which is why this
 * mirrors static_overlays.kind rather than the GeoJSON geometry type.
 */
export type SwatchGeometryKind = "point" | "line" | "polygon" | "polygon-outline" | "raster";

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

  // Filled polygon, and raster classes: a solid block of the colour.
  return (
    <span
      className="size-2.5 shrink-0 rounded-[2px]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
