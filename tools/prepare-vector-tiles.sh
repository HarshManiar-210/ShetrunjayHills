#!/usr/bin/env bash
#
# Convert one delivered GeoJSON into a PMTiles archive for serving.
#
# Why: a whole-file GeoJSON overlay is parsed into one object per feature in
# MapLibre's worker, so cost scales with the file rather than with what is on
# screen. The tree survey is 856,700 points / 166 MB, which was enough to kill
# the tab. Tiles bound that cost to the current viewport instead.
#
# The MVT layer inside the archive is named after the overlay's key, because
# that is the name the frontend uses as `source-layer` (see Map.tsx). Keeping
# the two equal is what lets the frontend stay free of per-layer names.
#
# Usage:  tools/prepare-vector-tiles.sh <overlay-key> <input.geojson> [minzoom] [maxzoom]
# e.g.    tools/prepare-vector-tiles.sh treeHeight apps/vector-data/tree-height.geojson
#
# Requires GDAL 3.8+ (the PMTiles driver):  brew install gdal

set -euo pipefail

key=${1:?overlay key (must match static_overlays.key)}
input=${2:?input .geojson path}
minzoom=${3:-9}
maxzoom=${4:-16}
output="${input%.geojson}.pmtiles"

# The driver builds an MBTiles alongside the target and converts it at the
# end; a run killed partway leaves it behind, and a stale one confuses the
# next run.
rm -f "$output" "$output.tmp.mbtiles"

# MAX_SIZE is left at the driver's 500 KB default on purpose. A low-zoom tile
# covering the whole survey cannot hold every point, and the driver dropping
# features to stay under the cap is exactly the thinning we want there — the
# alternative is one multi-megabyte tile that stalls the very zoom level the
# map opens at.
ogr2ogr -f PMTiles "$output" "$input" \
  -nln "$key" \
  -dsco "MINZOOM=$minzoom" \
  -dsco "MAXZOOM=$maxzoom" \
  -dsco "NAME=$key"

ls -lh "$output"
