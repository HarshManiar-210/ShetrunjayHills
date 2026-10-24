#!/usr/bin/env python3
"""Prepare the SMC (soil & moisture conservation) layers for the dashboard.

Takes the client's delivered GeoJSON for one set -- Existing Water
Conservation (Matipala / Vantalavadi / CheckDam / Causeway) or Proposed
Conservation Sites (Matipala / Vantalavdi / CheckDam) -- and writes the
served files in apps/vector-data, adding the two popup fields the delivery
lacks:

  * GridNum -- the study-area grid cell (apps/vector-data/Zones.geojson,
    189 cells, each with its GridNum) that the feature's centre falls in.
    None of the delivered files carry it. A feature outside every cell
    gets no GridNum, and the popup leaves the field out.
  * areaHa  -- only where the delivery has none (Causeway): the feature's
    area on the sphere, in hectares, to the delivery's own 3 decimals. A
    delivered areaHa is kept as delivered.

Everything else (geometry, zone, name, volume) passes through unchanged.
Pure Python, no GDAL/shapely: the polygons are small enough that the
centre is the mean of the outer ring's vertices.

Each input is matched to its served file by the FeatureCollection's own
`name` (Matipala, Vantalavdi, CheckDam, Causeway), so the downloaded file
names -- "Matipala (1).geojson" and the like -- don't matter.

Usage:
    python tools/prepare-smc.py existing <delivered .geojson>...
    python tools/prepare-smc.py proposed <delivered .geojson>...
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VECTOR = ROOT / "apps" / "vector-data"

# set -> delivered FeatureCollection name -> served file
SETS = {
    "existing": {
        "Matipala": "maitpaala-existing-water-conservation.geojson",
        "Vantalavdi": "vantalawadi-existing-water-conservation.geojson",
        "CheckDam": "check-dam-existing-water-conservation.geojson",
        "Causeway": "causeway-existing-water-conservation.geojson",
    },
    "proposed": {
        "Matipala": "matipala-proposed-conservation-sites.geojson",
        "Vantalavdi": "vantalavdi-proposed-conservation-sites.geojson",
        "CheckDam": "checkdam-proposed-conservation-sites.geojson",
    },
}

# IUGG mean Earth radius, metres -- the same one the API's rasterstats uses.
EARTH_RADIUS_M = 6_371_008.8


def outer_rings(geometry: dict) -> list[list[list[float]]]:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"][0]]
    if geometry["type"] == "MultiPolygon":
        return [poly[0] for poly in geometry["coordinates"]]
    raise ValueError(f"unexpected geometry {geometry['type']}")


def centre(geometry: dict) -> tuple[float, float]:
    ring = outer_rings(geometry)[0][:-1]
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)


def in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    for (x1, y1, *_), (x2, y2, *_) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            inside = not inside
    return inside


def ring_area_m2(ring: list[list[float]]) -> float:
    """Area of a lon/lat ring on the sphere (the standard spherical-excess sum)."""
    total = 0.0
    for (lon1, lat1, *_), (lon2, lat2, *_) in zip(ring, ring[1:]):
        total += math.radians(lon2 - lon1) * (
            2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2))
        )
    return abs(total) * EARTH_RADIUS_M**2 / 2


def area_ha(geometry: dict) -> float:
    if geometry["type"] == "Polygon":
        polys = [geometry["coordinates"]]
    else:
        polys = geometry["coordinates"]
    m2 = sum(ring_area_m2(p[0]) - sum(ring_area_m2(h) for h in p[1:]) for p in polys)
    return m2 / 10_000


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] not in SETS:
        print(__doc__, file=sys.stderr)
        return 2
    targets = SETS[sys.argv[1]]

    grid = json.loads((VECTOR / "Zones.geojson").read_text(encoding="utf-8"))
    cells = [(f["properties"]["GridNum"], outer_rings(f["geometry"])) for f in grid["features"]]

    for path in sys.argv[2:]:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        served = targets.get(data.get("name"))
        if served is None:
            print(f"{path}: no {sys.argv[1]} layer is named {data.get('name')!r}", file=sys.stderr)
            return 1
        unplaced = 0
        for feature in data["features"]:
            props = feature["properties"]
            x, y = centre(feature["geometry"])
            hit = next(
                (num for num, rings in cells if any(in_ring(x, y, r) for r in rings)),
                None,
            )
            if hit is None:
                unplaced += 1
            else:
                props["GridNum"] = hit
            if props.get("areaHa") is None:
                props["areaHa"] = round(area_ha(feature["geometry"]), 3)

        (VECTOR / served).write_text(
            json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
        )
        print(f"{served}: {len(data['features'])} features, {unplaced} outside the grid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
