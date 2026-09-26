"""Re-place the rasters that are clipped to the study area.

Why this exists
---------------
These rasters were delivered as plain PNGs with no georeferencing, and seeded
with lat/lng bounding boxes. Each is clipped to the study area, so its opaque
mask *is* the study-area outline -- which gives a way to measure where it
belongs: rasterise StudyArea.geojson in a candidate grid and fit the extent
that best matches the mask (intersection-over-union).

Doing that showed two kinds of misplacement:

1. Toposheet, FCC, Forest Cover, Green Cover, Vegetation Change and LULC are
   north-up in UTM zone 42N (EPSG:32642), not Web Mercator -- the grid
   MapLibre lays an image source out in. Here, ~2.8 deg east of that zone's
   central meridian, UTM grid north is ~1 deg from true north, so no lat/lng
   box can line them up. Best fits, e.g. Green Cover 2018:

       Web Mercator box  0.959     UTM 42N box  0.986 (square 1.18 m pixels)

   These are resampled onto a Web Mercator grid, keeping the delivered width.
   Classified rasters use nearest neighbour, so every pixel keeps an exact
   class colour (rasterstats counts colours exactly); photographic ones
   (Toposheet, FCC) use bilinear with premultiplied alpha.

   The Toposheet is not clipped to the study area, so it can't be fitted to
   the outline either. It came with its sheet extent in EPSG:4326
   (TOPOSHEET_EXTENT); the sheet's four corners are found in the image and
   fitted to that extent's UTM corners, which gives the UTM box of the whole
   canvas (square 7.04 m pixels, corners within ~1 px).

   Fragmentation only covers forest patches, not the whole study area, so its
   mask can't be fitted to the outline. Its opaque area is the same year's
   Green Cover green class, so it is fitted to that instead.

2. Growing Stock, Habitat Suitability and Wildlife Corridors are on an
   EPSG:4326 grid (equal degrees per pixel, as prepare-drone-rasters.py found
   for the drone products) -- they fit best as a plain lat/lng box, but not
   the one seeded. Only their bounds change; a 4326 grid over ~0.06 deg is
   drawn within a pixel of linear in Web Mercator, so the PNGs stay as they are.

Everything is re-derived from apps/raster-data/originals, so the script can be
re-run. The fits are only as good as the outline the rasters were clipped
with, a few metres; ask the client for GeoTIFFs to do better.

Requires Pillow, numpy and scipy:  pip install pillow numpy scipy

Usage
-----
    python tools/prepare-study-area-rasters.py          # report only
    python tools/prepare-study-area-rasters.py --write  # rewrite PNGs + init.sql
    python tools/prepare-study-area-rasters.py --sql    # also print UPDATEs for
                                                        # an already-seeded DB
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize

Image.MAX_IMAGE_PIXELS = None

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RASTER_DIR = os.path.join(REPO, "apps", "raster-data")
ORIGINALS = os.path.join(RASTER_DIR, "originals")
STUDY_AREA = os.path.join(REPO, "apps", "vector-data", "StudyArea.geojson")
INIT_SQL = os.path.join(REPO, "infra", "postgis-init", "init.sql")

# (served path glob, grid, resampling). "utm" products are resampled from
# ORIGINALS; "4326" ones only get their bounds refitted.
PRODUCTS = [
    ("toposheet.png", "utm", "bilinear"),
    ("FCC/*.png", "utm", "bilinear"),
    ("forest-cover/*.png", "utm", "nearest"),
    ("green-cover/*.png", "utm", "nearest"),
    ("vegetation-change/*.png", "utm", "nearest"),
    ("lulc/*.png", "utm", "nearest"),
    ("fragmentation/*.png", "utm", "nearest"),
    ("growingstock.png", "4326", None),
    ("habitat.png", "4326", None),
    ("wildlifecorridor.png", "4326", None),
]

# The delivered Toposheet's sheet extent: W, S, E, N in EPSG:4326.
TOPOSHEET_EXTENT = (71.499945, 21.249988, 72.000122, 21.750008)

# Fragmentation is fitted to this class of the same year's Green Cover.
GREEN_COVER_GREEN = (10, 141, 35)

# A pixel this transparent is outside the footprint (matches rasterstats).
MIN_OPAQUE_ALPHA = 0x20

# The fit runs on the mask downsampled to about this width, against a
# reference rasterised at about REF_WIDTH; the optimum still resolves to well
# under a source pixel.
FIT_WIDTH = 1500
REF_WIDTH = 6000

# WGS84 / UTM zone 42N.
A = 6378137.0
F = 1 / 298.257223563
E2 = F * (2 - F)
EP2 = E2 / (1 - E2)
K0 = 0.9996
LON0 = 69.0
FALSE_EASTING = 500000.0


def utm_forward(lon, lat):
    """lon/lat degrees -> UTM 42N metres. Works on scalars or numpy arrays."""
    phi = np.radians(lat)
    lam = np.radians(lon - LON0)
    sin, cos, tan = np.sin(phi), np.cos(phi), np.tan(phi)
    n = A / np.sqrt(1 - E2 * sin**2)
    t = tan**2
    c = EP2 * cos**2
    a = cos * lam
    m = A * (
        (1 - E2 / 4 - 3 * E2**2 / 64 - 5 * E2**3 / 256) * phi
        - (3 * E2 / 8 + 3 * E2**2 / 32 + 45 * E2**3 / 1024) * np.sin(2 * phi)
        + (15 * E2**2 / 256 + 45 * E2**3 / 1024) * np.sin(4 * phi)
        - (35 * E2**3 / 3072) * np.sin(6 * phi)
    )
    x = K0 * n * (a + (1 - t + c) * a**3 / 6
                  + (5 - 18 * t + t * t + 72 * c - 58 * EP2) * a**5 / 120)
    y = K0 * (m + n * tan * (a * a / 2 + (5 - t + 9 * c + 4 * c * c) * a**4 / 24
                             + (61 - 58 * t + t * t + 600 * c - 330 * EP2) * a**6 / 720))
    return x + FALSE_EASTING, y


def utm_inverse(x, y):
    """UTM 42N metres -> lon/lat degrees, by Newton on utm_forward."""
    lon, lat = LON0, y / 110574.0
    for _ in range(20):
        fx, fy = utm_forward(lon, lat)
        h = 1e-6
        jx = (np.array(utm_forward(lon + h, lat)) - (fx, fy)) / h
        jy = (np.array(utm_forward(lon, lat + h)) - (fx, fy)) / h
        d = np.linalg.solve(np.column_stack([jx, jy]), [x - fx, y - fy])
        lon, lat = lon + d[0], lat + d[1]
    return float(lon), float(lat)


def merc_y(lat):
    return np.degrees(np.log(np.tan(np.pi / 4 + np.radians(lat) / 2)))


def merc_lat(y):
    return np.degrees(2 * np.arctan(np.exp(np.radians(y))) - np.pi / 2)


# --- fitting -----------------------------------------------------------------
#
# A reference is (mask, box): a boolean grid covering box = (x0, y0, x1, y1)
# in the fit's frame (UTM metres or lon/lat degrees), row 0 at y1.


def outline_reference(to_frame):
    with open(STUDY_AREA, encoding="utf-8") as f:
        gj = json.load(f)
    rings = [
        (i, [tuple(map(float, to_frame(c[0], c[1]))) for c in ring])
        for feat in gj["features"]
        for poly in feat["geometry"]["coordinates"]
        for i, ring in enumerate(poly)
    ]
    xs = [x for _, r in rings for x, _ in r]
    ys = [y for _, r in rings for _, y in r]
    pad_x, pad_y = (max(xs) - min(xs)) * 0.05, (max(ys) - min(ys)) * 0.05
    box = (min(xs) - pad_x, min(ys) - pad_y, max(xs) + pad_x, max(ys) + pad_y)
    w = REF_WIDTH
    h = round(w * (box[3] - box[1]) / (box[2] - box[0]))
    img = Image.new("1", (w, h), 0)
    d = ImageDraw.Draw(img)
    for i, r in rings:
        d.polygon([((x - box[0]) / (box[2] - box[0]) * w,
                    (box[3] - y) / (box[3] - box[1]) * h) for x, y in r],
                  fill=1 if i == 0 else 0)
    return np.array(img), box, (min(xs), min(ys), max(xs), max(ys))


def sample(ref, box, shape):
    """The reference sampled at the pixel centres of a grid of shape over box."""
    mask, (rx0, ry0, rx1, ry1) = ref
    h, w = shape
    x0, y0, x1, y1 = box
    xs = x0 + (np.arange(w) + 0.5) / w * (x1 - x0)
    ys = y1 - (np.arange(h) + 0.5) / h * (y1 - y0)
    cols = ((xs - rx0) / (rx1 - rx0) * mask.shape[1]).astype(int)
    rows = ((ry1 - ys) / (ry1 - ry0) * mask.shape[0]).astype(int)
    ok_c = (cols >= 0) & (cols < mask.shape[1])
    ok_r = (rows >= 0) & (rows < mask.shape[0])
    out = np.zeros(shape, bool)
    out[np.ix_(ok_r, ok_c)] = mask[np.ix_(rows[ok_r], cols[ok_c])]
    return out


def fit(opaque, ref, start, step):
    """Best box for an image whose opaque mask is `opaque`, and its IoU."""
    s = max(1, opaque.shape[1] // FIT_WIDTH)
    target = opaque[s // 2::s, s // 2::s]

    def iou(box):
        if box[2] <= box[0] or box[3] <= box[1]:
            return 0.0
        m = sample(ref, box, target.shape)
        return (m & target).sum() / max((m | target).sum(), 1)

    simplex = [list(start)] + [[v + (step if i == j else 0) for j, v in enumerate(start)]
                               for i in range(4)]
    res = optimize.minimize(lambda b: -iou(b), start, method="Nelder-Mead",
                            options=dict(initial_simplex=simplex, xatol=step / 400,
                                         fatol=1e-6, maxiter=1000))
    return list(res.x), -res.fun


def fit_corners(opaque, extent):
    """UTM box of a canvas whose opaque quad is `extent`'s lat/lng corners.

    The quad's extreme pixels are matched to the corners' UTM positions by
    least squares (x/y scale and offset, no rotation: the grid is UTM
    north-up). Returns the box and the worst corner residual in pixels.
    """
    w, s, e, n = extent
    rows, cols = np.nonzero(opaque)
    found = [(cols[i], rows[i]) for i in (np.argmax(-rows - cols), np.argmax(-rows + cols),
                                         np.argmax(rows - cols), np.argmax(rows + cols))]
    utm = [utm_forward(*c) for c in ((w, n), (e, n), (w, s), (e, s))]
    (ax, cx), *_ = np.linalg.lstsq([[x, 1] for x, _ in utm], [c for c, _ in found], rcond=None)
    (ay, cy), *_ = np.linalg.lstsq([[y, 1] for _, y in utm], [r for _, r in found], rcond=None)
    worst = max(abs(ax * x + cx - c) + abs(ay * y + cy - r) for (x, y), (c, r) in zip(utm, found))
    h, wd = opaque.shape
    return [(0 - cx) / ax, (h - cy) / ay, (wd - cx) / ax, (0 - cy) / ay], worst


# --- resampling --------------------------------------------------------------


def warp_to_mercator(src, box, method):
    """Resample src (RGBA over a UTM box) onto a Web Mercator grid."""
    sh, sw = src.shape[:2]
    x0, y0, x1, y1 = box
    corners = [utm_inverse(x, y) for x in (x0, x1) for y in (y0, y1)]
    west, east = min(c[0] for c in corners), max(c[0] for c in corners)
    south, north = min(c[1] for c in corners), max(c[1] for c in corners)

    out_w = sw
    out_h = round(out_w * (merc_y(north) - merc_y(south)) / (east - west))
    lon = west + (np.arange(out_w) + 0.5) / out_w * (east - west)
    my_n, my_s = merc_y(north), merc_y(south)

    order = 0 if method == "nearest" else 1
    if order:
        alpha = src[:, :, 3].astype(np.float32) / 255
        planes = [src[:, :, ch] * alpha for ch in range(3)] + [alpha]
    else:
        planes = [src[:, :, ch] for ch in range(4)]

    out = np.zeros((out_h, out_w, 4), np.uint8)
    for r0 in range(0, out_h, 256):  # strips keep the coordinate grids small
        rows = np.arange(r0, min(r0 + 256, out_h))
        lat = merc_lat(my_n - (rows + 0.5) / out_h * (my_n - my_s))
        lon_g, lat_g = np.meshgrid(lon, lat)
        ux, uy = utm_forward(lon_g, lat_g)
        coords = [(y1 - uy) / (y1 - y0) * sh - 0.5, (ux - x0) / (x1 - x0) * sw - 0.5]
        got = [ndimage.map_coordinates(p, coords, order=order, cval=0) for p in planes]
        if order:
            a = got[3]
            rgb = np.stack(got[:3], -1) / np.maximum(a, 1e-6)[..., None]
            rgb[a <= 0] = 0
            strip = np.dstack([np.clip(rgb, 0, 255), a * 255]).round()
        else:
            strip = np.stack(got, -1)
        out[rows] = strip.astype(np.uint8)
    return out, (west, south, east, north)


# --- driver ------------------------------------------------------------------


def opaque_mask(img):
    return np.asarray(img)[:, :, 3] >= MIN_OPAQUE_ALPHA


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true", help="rewrite the PNGs and init.sql")
    ap.add_argument("--sql", action="store_true", help="print UPDATEs for a seeded DB")
    ap.add_argument("only", nargs="?", help="process just the products matching this glob")
    args = ap.parse_args()

    mask, box, utm_start = outline_reference(utm_forward)
    utm_ref = (mask, box)
    mask, box, deg_start = outline_reference(lambda x, y: (x, y))
    deg_ref = (mask, box)

    bounds = {}
    utm_boxes = {}  # served path -> (UTM box, image), for Fragmentation's reference
    for pattern, grid, method in PRODUCTS:
        if args.only and args.only != pattern:
            continue
        base = ORIGINALS if grid == "utm" else RASTER_DIR
        paths = sorted(glob.glob(os.path.join(base, pattern)))
        if not paths:
            raise SystemExit(f"no files for {pattern} under {base}")
        for path in paths:
            rel = os.path.relpath(path, base).replace(os.sep, "/")
            src = np.array(Image.open(path).convert("RGBA"))
            opaque = opaque_mask(src)

            if grid == "4326":
                box, score = fit(opaque, deg_ref, deg_start, 0.0004)
                bounds[rel] = tuple(box)
                print(f"{rel:36s} 4326  IoU {score:.4f}")
                continue

            if rel == "toposheet.png":
                box, err = fit_corners(opaque, TOPOSHEET_EXTENT)
                fitted = f"fitted to sheet extent, corners within {err:.1f} px"
            elif rel.startswith("fragmentation/"):
                gc_box, gc = utm_boxes["green-cover/" + os.path.basename(rel)]
                ref = (np.all(gc[:, :, :3] == GREEN_COVER_GREEN, -1) & opaque_mask(gc), gc_box)
                box, score = fit(opaque, ref, gc_box, 40)
                fitted = f"IoU {score:.4f} vs green cover"
            else:
                box, score = fit(opaque, utm_ref, utm_start, 40)
                fitted = f"IoU {score:.4f} vs outline"
            utm_boxes[rel] = (box, src)
            px = ((box[2] - box[0]) / src.shape[1], (box[3] - box[1]) / src.shape[0])
            img, b = warp_to_mercator(src, box, method)
            bounds[rel] = b
            print(f"{rel:36s} UTM   {fitted}, "
                  f"pixel {px[0]:.3f} x {px[1]:.3f} m -> {img.shape[1]}x{img.shape[0]}")
            if args.write:
                out = os.path.join(RASTER_DIR, rel)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                Image.fromarray(img, "RGBA").save(out, optimize=True)

    if args.write:
        with open(INIT_SQL, encoding="utf-8", newline="") as f:
            sql = f.read()
        for rel, b in bounds.items():
            pat = re.compile(r"('raster-data/" + re.escape(rel) + r"', \d+, )"
                             r"[-\d.]+, [-\d.]+, [-\d.]+, [-\d.]+\)")
            sql, n = pat.subn(lambda m: m.group(1) + ", ".join(f"{v:.7f}" for v in b) + ")", sql)
            if n != 1:
                raise SystemExit(f"expected one init.sql row for {rel}, found {n}")
        with open(INIT_SQL, "w", encoding="utf-8", newline="") as f:
            f.write(sql)
        print(f"updated {len(bounds)} rows in {INIT_SQL}")

    if args.sql:
        for rel, (w, s, e, n) in bounds.items():
            print(f"UPDATE static_overlays SET min_lon={w:.7f}, min_lat={s:.7f}, "
                  f"max_lon={e:.7f}, max_lat={n:.7f} WHERE file_path='raster-data/{rel}';")


if __name__ == "__main__":
    main()
