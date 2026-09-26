"""Re-derive the served drone rasters from apps/raster-data/originals.

Why this exists
---------------
The six drone products (Orthomosaic, DSM, DTM, Slope, Aspect, CHM) were
delivered as plain PNGs with no georeferencing of any kind -- no GeoTIFF, no
world file, no .aux.xml. Their lat/lng placement lives only in the seed rows
in infra/postgis-init/init.sql, and three things about that arrangement were
visibly wrong on the map:

1. Each PNG pads its irregular drone footprint out to a rectangle with opaque
   *white*, roughly 420 px on each side of a 4096 px canvas. MapLibre painted
   that padding over the basemap as a white box.

2. The seeded bounds describe the footprint, but the image handed to MapLibre
   was the padded canvas -- so the canvas got stretched to fit the footprint's
   box and the imagery came out squeezed by about 29%. That is the client's
   "some images look like shrunk from the sides".

3. All six share one 31068x16641 grid, yet carried four different extents
   between them -- transcription noise, not real differences.

What it does
------------
Crops each original to its own content, makes the white padding transparent
(only white connected to the border — see drop_white), and writes a 4096-wide
serving PNG. It also prints the corrected
bounds to paste into init.sql, derived as follows:

  * Each product implies a full-canvas extent, by extrapolating its seeded
    footprint bounds outwards across its own padding. Those six estimates are
    averaged into one canvas, which is what makes the six products mutually
    consistent again.
  * The canvas is then forced to the pixel grid's own aspect ratio in
    EPSG:4326 -- the grid the client's data is delivered in: a pixel spans
    the same number of degrees east-west as north-south. (Measured on the
    padded originals, Orthomosaic and DSM come out at a 1.004 lat/lon
    degree ratio per pixel, against 1.079 in Web Mercator.) An earlier
    version forced the aspect in Web Mercator instead, which squeezed the
    drone imagery ~7% north-south. The top edge is the anchor, because it is
    the edge the six delivered extents already agree on most closely
    (Orthomosaic and DSM to within ~2 m).
  * MapLibre places an image source linearly in Web Mercator, not in
    degrees, so a 4326 grid is drawn very slightly non-linearly -- over the
    ~0.06 deg these rasters span that is well under one pixel, so the PNGs
    are served on their delivered 4326 grid rather than reprojected.
  * Each product's own bounds are then read back off that shared canvas.

Residual error
--------------
This removes the distortion and makes the six agree, but it cannot invent
georeferencing that was never delivered: the seeded bounds are themselves
only good to a few metres, and the corrected placement inherits that. Ask the
client for the source GeoTIFFs (or a world file per PNG) to do better -- that
is also what a proper tile pyramid would need.

Requires Pillow, numpy and scipy:  pip install pillow numpy scipy

Usage
-----
    python tools/prepare-drone-rasters.py            # report only
    python tools/prepare-drone-rasters.py --write    # also rewrite the PNGs
"""

from __future__ import annotations

import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageChops
from scipy import ndimage

# A 517 MP source is well past Pillow's decompression-bomb guard, and these
# are our own files.
Image.MAX_IMAGE_PIXELS = None

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RASTER_DIR = os.path.join(REPO, "apps", "raster-data")
ORIGINALS = os.path.join(RASTER_DIR, "originals")

# Serving width. The single-texture ceiling that is safe on every GPU we care
# about is 4096; going wider risks a blank layer on older mobile hardware.
# Cropping the padding away means these 4096 px now cover only the footprint,
# which is about 26% more detail than before for the same texture budget.
SERVING_WIDTH = 4096

# Anything at or above this in all three channels counts as padding.
# The padding is pure #FFFFFF; the threshold only allows for PNG quantisation.
WHITE = 250

# key -> (original filename, served filename, seeded footprint bounds)
# The seeded bounds are the *input* to the correction, read from init.sql as
# delivered; the corrected values this script prints replace them.
PRODUCTS: dict[str, tuple[str, str, tuple[float, float, float, float]]] = {
    "orthomosaic": ("orthomosaic.png", "orthomosaic.png",
                    (71.7260650456997695, 21.4501880729730381, 71.8235358472878715, 21.5126892571809378)),
    "dsm":   ("DSM.png",   "DSM.png",   (71.7271798880087346, 21.4508330628973276, 71.8229888063212201, 21.5126892567312282)),
    "dtm":   ("DTM.png",   "DTM.png",   (71.727678, 21.452812, 71.823913, 21.512044)),
    "slope": ("Slope.png", "Slope.png", (71.727678, 21.452812, 71.823913, 21.512044)),
    "aspect": ("Aspect.png", "Aspect.png", (71.727678, 21.452812, 71.823913, 21.512044)),
    "chm":   ("CHM.png",   "CHM.png",   (71.727066, 21.452069, 71.823365, 21.512053)),
}


def content_box(path: str) -> tuple[tuple[int, int, int, int], tuple[int, int]]:
    """Pixel box of everything that is not white padding, plus the canvas size.

    Measured on the served proxy rather than the 517 MP original: decoding the
    original costs ~2 GB, and the proxy locates the edge to within a pixel or
    two of it, which is a few metres on the ground.
    """
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        size = rgb.size
        white = Image.new("RGB", size, (255, 255, 255))
        box = ImageChops.difference(rgb, white).getbbox()
    if box is None:
        raise SystemExit(f"{path}: image is entirely white")
    return box, size


def drop_white(im: Image.Image) -> Image.Image:
    """Make the white padding transparent, without touching the imagery.

    Only white that is *connected to the border* is removed, not every white
    pixel. That distinction matters: clearing all white perforated the CHM,
    whose low-canopy end of the ramp is very pale — the footprint came out
    riddled with holes. Slope's palette likewise tops out at #ffffbf.
    White enclosed by real data is data, and stays.
    """
    r, g, b, a = im.split()
    darkest = ImageChops.darker(ImageChops.darker(r, g), b)
    white = np.array(darkest.point(lambda v: 255 if v >= WHITE else 0), dtype=bool)

    # One pixel of white all round, so a single labelled region covers every
    # part of the border and "touches the edge" becomes "shares the frame's
    # label" — no need to seed from each border run separately.
    framed = np.ones((white.shape[0] + 2, white.shape[1] + 2), dtype=bool)
    framed[1:-1, 1:-1] = white

    labels, _ = ndimage.label(framed)
    outside = labels[1:-1, 1:-1] == labels[0, 0]

    alpha = np.array(a)
    alpha[outside] = 0
    im.putalpha(Image.fromarray(alpha))
    return im


def load_cropped(
    src: str, fallback: str, box: tuple[int, int, int, int], proxy_size: tuple[int, int]
) -> tuple[Image.Image, tuple[int, int]]:
    """Crop `box` (measured on the proxy) out of the full-resolution original.

    Decoding a 517 MP PNG needs ~2 GB. If that is not available, fall back to
    cropping the already-served proxy — the padding and distortion fixes still
    land, only the 26% detail regain is lost.
    """
    cw, ch = proxy_size
    try:
        with Image.open(src) as im:
            ow, oh = im.size
            sx, sy = ow / cw, oh / ch
            crop = (round(box[0] * sx), round(box[1] * sy), round(box[2] * sx), round(box[3] * sy))
            return im.convert("RGBA").crop(crop), (ow, oh)
    except (MemoryError, OSError) as err:
        print(f"   ! {os.path.basename(src)}: {err}; falling back to the served proxy")
        with Image.open(fallback) as im:
            return im.convert("RGBA").crop(box), (cw, ch)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="rewrite the served PNGs")
    args = parser.parse_args()

    # --- 1. each product's implied full-canvas extent -----------------------
    boxes: dict[str, tuple[tuple[int, int, int, int], tuple[int, int]]] = {}
    lon_mins, lon_maxs, lat_tops = [], [], []

    for key, (_, served, (w_lon, s_lat, e_lon, n_lat)) in PRODUCTS.items():
        box, (cw, ch) = content_box(os.path.join(RASTER_DIR, served))
        boxes[key] = (box, (cw, ch))
        left, top, right, bottom = box

        # The derivation reads the seeded bounds against a *padded* image. Run
        # it twice and the second pass would measure the already-cropped
        # output against bounds that now describe it, and quietly drift. The
        # served PNGs are regenerable, so the fix is to restore them.
        if (left, top, right, bottom) == (0, 0, cw, ch):
            raise SystemExit(
                f"{served} has no padding left - it has already been prepared. "
                f"Restore the served PNGs (git checkout apps/raster-data) before "
                f"re-running, and reset PRODUCTS' bounds to the values init.sql "
                f"carried at that commit."
            )

        lon_per_px = (e_lon - w_lon) / (right - left)
        lon_mins.append(w_lon - left * lon_per_px)
        lon_maxs.append(w_lon + (cw - left) * lon_per_px)

        # Extrapolated in degrees: the pixel grid is EPSG:4326, so every row
        # spans the same latitude.
        lat_per_px = (n_lat - s_lat) / (bottom - top)
        lat_tops.append(n_lat + top * lat_per_px)

        print(f"{key:12s} canvas {cw}x{ch}  content {right-left}x{bottom-top} "
              f"(L{left} R{cw-right} T{top} B{ch-bottom})")

    canvas_w, canvas_h = next(iter(boxes.values()))[1]
    if any(size != (canvas_w, canvas_h) for _, size in boxes.values()):
        raise SystemExit("products do not share one canvas size; cannot derive a shared extent")

    lon_min = sum(lon_mins) / len(lon_mins)
    lon_max = sum(lon_maxs) / len(lon_maxs)
    lat_top = sum(lat_tops) / len(lat_tops)

    # --- 2. force the canvas to the pixel grid's own aspect ----------------
    # Square pixels in degrees (EPSG:4326), not on the ground.
    dlat = (lon_max - lon_min) / (canvas_w / canvas_h)
    lat_bottom = lat_top - dlat

    spread_lon = (max(lon_maxs) - min(lon_maxs)) * 111_320 * math.cos(math.radians(21.48))
    spread_lat = (max(lat_tops) - min(lat_tops)) * 110_574
    print(f"\nshared canvas  lon {lon_min:.7f}..{lon_max:.7f}  "
          f"lat {lat_bottom:.7f}..{lat_top:.7f}")
    print(f"agreement between the six: east edge +/-{spread_lon:.0f} m, "
          f"north edge +/-{spread_lat:.0f} m")

    # --- 3. read each product's corrected bounds off the shared canvas -----
    print("\n-- corrected bounds (min_lon, min_lat, max_lon, max_lat)")
    for key, (box, _) in boxes.items():
        left, top, right, bottom = box
        w = lon_min + (lon_max - lon_min) * left / canvas_w
        e = lon_min + (lon_max - lon_min) * right / canvas_w
        n = lat_top - dlat * top / canvas_h
        s = lat_top - dlat * bottom / canvas_h
        print(f"   {key:12s} {w:.7f}, {s:.7f}, {e:.7f}, {n:.7f}")

    if not args.write:
        print("\n(report only -- pass --write to rewrite the PNGs)")
        return 0

    # --- 4. rewrite the served PNGs ----------------------------------------
    print()
    for key, (original, served, _) in PRODUCTS.items():
        box, (cw, ch) = boxes[key]
        src = os.path.join(ORIGINALS, original)
        dst = os.path.join(RASTER_DIR, served)

        im, source_size = load_cropped(src, dst, box, (cw, ch))

        height = round(im.height * SERVING_WIDTH / im.width)
        im = im.resize((SERVING_WIDTH, height), Image.LANCZOS)
        im = drop_white(im)

        transparent = im.getchannel("A").histogram()[0] / (im.width * im.height)
        im.save(dst, optimize=True)
        print(f"{key:12s} from {source_size[0]}x{source_size[1]} "
              f"-> {im.width}x{im.height}, {transparent:.1%} transparent")

    return 0


if __name__ == "__main__":
    sys.exit(main())
