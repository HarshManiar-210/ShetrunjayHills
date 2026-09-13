export type SwatchGeometryKind = "point" | "line" | "polygon";

export function LayerSwatch({ color, geometryKind }: { color: string; geometryKind: SwatchGeometryKind }) {
  if (geometryKind === "point") {
    return (
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className="h-0.5 w-4 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
