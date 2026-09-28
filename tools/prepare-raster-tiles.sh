#!/usr/bin/env bash
#
# Tile one full-resolution raster PNG into a lossless-WebP PMTiles archive.
#
# Why: the drone products are delivered at ~24,000 px wide. A MapLibre image
# source uploads the whole picture as one GPU texture, and most GPUs cap a
# texture at 8192 or 16384 px — past that the layer draws blank or kills the
# tab. Tiled, the browser only ever fetches the 256 px tiles on screen, so the
# full delivery can be served without shrinking it.
#
# Lossless end to end: tiles are lossless WebP, and zoom 19 (~0.28 m/px at
# this latitude) is finer than the ~0.41 m/px source, so the deepest zoom
# carries every delivered pixel. Default 'average' resampling copies pixels
# when upsampling and box-averages when building the zoomed-out levels.
#
# The PNGs carry no georeferencing, so the extent is passed in — the same
# bounds as the layer's static_overlays row in init.sql.
#
# Usage:  tools/prepare-raster-tiles.sh <input.png> <min_lon> <min_lat> <max_lon> <max_lat> [minzoom] [maxzoom]
# e.g.    tools/prepare-raster-tiles.sh apps/raster-data/DSM.png 71.7268383 21.4503137 71.8240547 21.5128380
# Output: <input>.pmtiles beside the input (apps/raster-data/DSM.pmtiles).
#
# Requires GDAL (brew install gdal) and the pmtiles CLI (brew install pmtiles).

set -euo pipefail

input=${1:?input .png path}
min_lon=${2:?min_lon}
min_lat=${3:?min_lat}
max_lon=${4:?max_lon}
max_lat=${5:?max_lat}
minzoom=${6:-10}
maxzoom=${7:-19}
output="${input%.*}.pmtiles"

work=$(mktemp -d -t raster-tiles)
trap 'rm -rf "$work"' EXIT

# Attach the extent without copying the (hundreds of MB) pixels.
gdal_translate -q -of VRT -a_srs EPSG:4326 \
  -a_ullr "$min_lon" "$max_lat" "$max_lon" "$min_lat" "$input" "$work/src.vrt"

# -x drops fully transparent tiles (the padding around the drone footprint).
gdal2tiles -q --xyz -x -w none -z "$minzoom-$maxzoom" \
  --tiledriver=WEBP --webp-lossless \
  --processes="$(sysctl -n hw.ncpu 2>/dev/null || nproc)" \
  "$work/src.vrt" "$work/tiles"

# pmtiles converts from MBTiles, not from a tile directory — pack one.
python3 - "$work/tiles" "$work/tiles.mbtiles" "$minzoom" "$maxzoom" \
  "$min_lon" "$min_lat" "$max_lon" "$max_lat" <<'PY'
import os, sqlite3, sys
src, dst, minz, maxz, *b = sys.argv[1:]
db = sqlite3.connect(dst)
db.executescript("""
  CREATE TABLE metadata (name TEXT, value TEXT);
  CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);
""")
lon, lat = (float(b[0]) + float(b[2])) / 2, (float(b[1]) + float(b[3])) / 2
db.executemany("INSERT INTO metadata VALUES (?, ?)", [
    ("name", os.path.basename(dst)), ("format", "webp"), ("type", "overlay"),
    ("minzoom", minz), ("maxzoom", maxz), ("bounds", ",".join(b)),
    ("center", f"{lon},{lat},{minz}"),
])
n = 0
for z in os.listdir(src):
    if not z.isdigit():
        continue
    for x in os.listdir(os.path.join(src, z)):
        for name in os.listdir(os.path.join(src, z, x)):
            y = int(name.split(".")[0])
            with open(os.path.join(src, z, x, name), "rb") as f:
                # MBTiles rows count from the bottom (TMS); --xyz counts from the top.
                db.execute("INSERT INTO tiles VALUES (?, ?, ?, ?)",
                           (int(z), int(x), (1 << int(z)) - 1 - y, f.read()))
            n += 1
db.commit()
print(f"packed {n} tiles")
PY

rm -f "$output"
pmtiles convert "$work/tiles.mbtiles" "$output"
ls -lh "$output"
