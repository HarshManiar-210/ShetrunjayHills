import { geometryKindOf } from "@/lib/sections";
import type { SwatchGeometryKind } from "@/components/LayerSwatch";
import type { LayerFeature } from "@/lib/layers-api";

/**
 * What the statistics panel and the JPG export both need to know about the
 * vector layers on screen, and about the study area they sit in.
 *
 * Here rather than in StatsPanel because the export needs it too, and a
 * library reaching into a component for its arithmetic is the wrong way
 * round — it also drags React into a module that only does sums.
 */

/**
 * The study area's official area in hectares, as the client states it. One
 * fixed figure, shown the same whatever layers are on, in the statistics
 * panel and the JPG export alike.
 *
 * Deliberately not read off StudyArea.geojson: its `area` property says
 * 3,395.963 ha and its name says 8,397 acres (~3,398 ha), and neither is the
 * figure the client quotes.
 */
export const STUDY_AREA_HA = 3394;

/** One row per vector layer, counted off the features actually loaded. */
export interface VectorLayerCount {
  id: number;
  name: string;
  count: number;
  color: string;
  geometryKind: SwatchGeometryKind;
}

export function countByLayer(features: LayerFeature[]): VectorLayerCount[] {
  const counts = new globalThis.Map<number, VectorLayerCount>();
  for (const feature of features) {
    const { id, name, color } = feature.properties;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else
      counts.set(id, {
        id,
        name,
        color,
        count: 1,
        geometryKind: geometryKindOf(feature.geometry.type),
      });
  }
  return [...counts.values()];
}
