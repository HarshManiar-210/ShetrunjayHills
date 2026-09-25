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

# Shuffle the features before tiling.
#
# A low-zoom tile cannot hold every feature, so the driver drops whatever no
# longer fits — in file order. Survey files are written in spatial order, so
# that means keeping one corner of the study area and discarding the rest:
# zoomed out, the tree survey showed as a couple of hard-edged strips and
# read as "no trees here" over ground that is covered in them.
#
# Shuffling makes the same truncation a uniform random sample instead, so a
# zoomed-out view thins evenly and still looks like the real distribution.
# Seeded, so a rebuild of the same input produces the same archive.
#
# ponytail: a line shuffle, not tippecanoe. Tippecanoe drops by density and
# would thin better still, but it is another tool to install and this needs
# no dependency we don't already have. Switch if even sampling stops being
# enough — e.g. if a layer's density varies so much that a uniform sample
# loses the sparse areas.
shuffled=$(mktemp -t vector-tiles-shuffled)
trap 'rm -f "$shuffled"' EXIT

python3 - "$input" "$shuffled" <<'PY'
import random, sys

src, dst = sys.argv[1], sys.argv[2]
lines = open(src).read().split("\n")

# Only the one-feature-per-line layout ogr2ogr and QGIS emit can be shuffled
# this cheaply. Anything else is left alone rather than silently mangled.
idx = [i for i, l in enumerate(lines) if l.startswith(('{"type":"Feature"', '{ "type": "Feature"'))]
if len(idx) < 2 or idx != list(range(idx[0], idx[0] + len(idx))):
    sys.stderr.write("not one feature per line — tiling unshuffled\n")
    open(dst, "w").write("\n".join(lines))
    sys.exit(0)

feats = [lines[i].rstrip(",") for i in idx]
random.Random(0).shuffle(feats)
body = [f + "," for f in feats[:-1]] + [feats[-1]]
open(dst, "w").write("\n".join(lines[: idx[0]] + body + lines[idx[-1] + 1 :]))
sys.stderr.write(f"shuffled {len(feats)} features\n")
PY

# MAX_SIZE is left at the driver's 500 KB default on purpose. A low-zoom tile
# covering the whole survey cannot hold every point, and the driver dropping
# features to stay under the cap is exactly the thinning we want there — the
# alternative is one multi-megabyte tile that stalls the very zoom level the
# map opens at.
ogr2ogr -f PMTiles "$output" "$shuffled" \
  -nln "$key" \
  -dsco "MINZOOM=$minzoom" \
  -dsco "MAXZOOM=$maxzoom" \
  -dsco "NAME=$key"

ls -lh "$output"
