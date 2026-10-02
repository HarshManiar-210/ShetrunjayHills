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
# Two opt-in settings, both off for the drone products:
#   SRC_GRID=3857    the PNG's rows are evenly spaced in Web Mercator, not in
#                    latitude — true of everything prepare-study-area-rasters.py
#                    resamples (the Toposheet). Placing such a PNG as a lat/lng
#                    grid shifts its middle rows by tens of metres.
#   WEBP_QUALITY=N   lossy WebP at quality N instead of lossless, for imagery
#                    where size matters more than exact pixels. Lossy WebP
#                    halves colour resolution at any quality, which softens
#                    thin coloured linework — why the Toposheet stays lossless.
#   CLIP=w,s,e,n     tile only this window (EPSG:4326 degrees) of the input,
#                    cut at the input's own pixels — nothing is resampled. The
#                    layer's static_overlays bounds become this window.
#
# Usage:  tools/prepare-raster-tiles.sh <input.png> <min_lon> <min_lat> <max_lon> <max_lat> [minzoom] [maxzoom]
# e.g.    tools/prepare-raster-tiles.sh apps/raster-data/DSM.png 71.7268383 21.4503137 71.8240547 21.5128380
#         SRC_GRID=3857 CLIP=71.707074,21.416648,71.874999,21.583427 \
#           tools/prepare-raster-tiles.sh apps/raster-data/toposheet.png \
#           71.4870089 21.2403840 72.0156875 21.7609689 8 15
# Output: <input>.pmtiles beside the input (apps/raster-data/DSM.pmtiles).
#
# Requires GDAL (brew install gdal) and the pmtiles CLI (brew install pmtiles).
# Without them locally, run it in ghcr.io/osgeo/gdal:ubuntu-small-3.10.0 with
# a pmtiles binary on PATH.

set -euo pipefail

input=${1:?input .png path}
min_lon=${2:?min_lon}
min_lat=${3:?min_lat}
max_lon=${4:?max_lon}
max_lat=${5:?max_lat}
minzoom=${6:-10}
maxzoom=${7:-19}
output="${input%.*}.pmtiles"

# The X template is what GNU mktemp requires; macOS accepts it too.
work=$(mktemp -d -t raster-tiles.XXXXXX)
trap 'rm -rf "$work"' EXIT

# Attach the extent without copying the (hundreds of MB) pixels.
if [ "${SRC_GRID:-4326}" = 3857 ]; then
  read -r west south _ <<<"$(echo "$min_lon $min_lat" | gdaltransform -s_srs EPSG:4326 -t_srs EPSG:3857)"
  read -r east north _ <<<"$(echo "$max_lon $max_lat" | gdaltransform -s_srs EPSG:4326 -t_srs EPSG:3857)"
  gdal_translate -q -of VRT -a_srs EPSG:3857 \
    -a_ullr "$west" "$north" "$east" "$south" "$input" "$work/src.vrt"
else
  gdal_translate -q -of VRT -a_srs EPSG:4326 \
    -a_ullr "$min_lon" "$max_lat" "$max_lon" "$min_lat" "$input" "$work/src.vrt"
fi

if [ -n "${CLIP:-}" ]; then
  IFS=, read -r min_lon min_lat max_lon max_lat <<<"$CLIP"
  gdal_translate -q -of VRT -projwin_srs EPSG:4326 \
    -projwin "$min_lon" "$max_lat" "$max_lon" "$min_lat" "$work/src.vrt" "$work/clip.vrt"
  src="$work/clip.vrt"
else
  src="$work/src.vrt"
fi

if [ -n "${WEBP_QUALITY:-}" ]; then
  webp=(--webp-quality="$WEBP_QUALITY")
else
  webp=(--webp-lossless)
fi

# -x drops fully transparent tiles (the padding around the drone footprint).
gdal2tiles -q --xyz -x -w none -z "$minzoom-$maxzoom" \
  --tiledriver=WEBP "${webp[@]}" \
  --processes="$(sysctl -n hw.ncpu 2>/dev/null || nproc)" \
  "$src" "$work/tiles"

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
