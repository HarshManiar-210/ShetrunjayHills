import { layerColor } from "@/lib/layer-style";

const POINT_TYPES = new Set(["Point", "MultiPoint"]);

export function LayerSwatch({ feature }: { feature: GeoJSON.Feature & { properties: { id: number } } }) {
  const color = layerColor(feature.properties.id);
  const isPoint = POINT_TYPES.has(feature.geometry.type);

  if (isPoint) {
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
