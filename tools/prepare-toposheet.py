"""Re-derive the served toposheet from apps/raster-data/originals/toposheet.png.

Why this exists
---------------
The toposheet was delivered as a plain PNG, clipped to the study area, with
no georeferencing. It was seeded with the study area's lat/lng bounding box,
which assumed the image is north-up in Web Mercator -- the grid MapLibre
lays an image source out in. It is not: the PNG is north-up in UTM zone 42N
(EPSG:32642), the SOI grid for this longitude. Here, ~2.8 deg east of that
zone's central meridian, UTM grid north is rotated ~1 deg from true north, so
no axis-aligned lat/lng box can line it up -- the sheet stayed visibly off
the study-area outline and the satellite imagery however its bounds were
nudged.

Measured by rasterising StudyArea.geojson over the PNG's opaque mask and
fitting the extent (intersection-over-union of the two shapes):

    Web Mercator, best box   0.961
    UTM 43N,      best box   0.926
    UTM 42N,      best box   0.996   (square 1.675 m pixels)

What it does
------------
Fits the original's UTM 42N extent to the study-area outline the same way,
then resamples the image onto a Web Mercator grid (bilinear, premultiplied
alpha) no wider than SERVING_WIDTH, and prints the lat/lng bounds to paste
into the toposheet row in infra/postgis-init/init.sql.

Residual error: the fit is only as good as the study-area outline the sheet
was clipped with, a few metres. Ask the client for the source GeoTIFF to do
better.

Requires Pillow, numpy and scipy:  pip install pillow numpy scipy

Usage
-----
    python tools/prepare-toposheet.py            # report only
    python tools/prepare-toposheet.py --write    # also rewrite the PNG
"""

from __future__ import annotations

import argparse
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RASTER_DIR = os.path.join(REPO, "apps", "raster-data")
ORIGINAL = os.path.join(RASTER_DIR, "originals", "toposheet.png")
SERVED = os.path.join(RASTER_DIR, "toposheet.png")
STUDY_AREA = os.path.join(REPO, "apps", "vector-data", "StudyArea.geojson")

# Same single-texture ceiling as prepare-drone-rasters.py.
SERVING_WIDTH = 4096

# The fit runs on a downsampled mask; 4x keeps it to seconds and still
# resolves the extent to well under a source pixel after optimisation.
FIT_DOWNSAMPLE = 4

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


def fit_utm_extent(alpha: np.ndarray) -> tuple[list[float], float]:
    """Best UTM box (x0, y0, x1, y1) for the original, and its IoU."""
    h, w = alpha.shape[0] // FIT_DOWNSAMPLE, alpha.shape[1] // FIT_DOWNSAMPLE
    target = np.array(Image.fromarray(alpha).resize((w, h), Image.NEAREST)) > 0

    with open(STUDY_AREA, encoding="utf-8") as f:
        gj = json.load(f)
    polys = [
        [[utm_forward(c[0], c[1]) for c in ring] for ring in poly]
        for feat in gj["features"]
        for poly in feat["geometry"]["coordinates"]
    ]

    def iou(box):
        x0, y0, x1, y1 = box
        m = Image.new("1", (w, h), 0)
        d = ImageDraw.Draw(m)
        for poly in polys:
            for i, ring in enumerate(poly):
                d.polygon([((x - x0) / (x1 - x0) * w, (y1 - y) / (y1 - y0) * h)
                           for x, y in ring], fill=1 if i == 0 else 0)
        mask = np.array(m)
        return (mask & target).sum() / (mask | target).sum()

    xs = [x for p in polys for r in p for x, _ in r]
    ys = [y for p in polys for r in p for _, y in r]
    start = [min(xs), min(ys), max(xs), max(ys)]
    simplex = [start] + [[v + (40 if i == j else 0) for j, v in enumerate(start)]
                         for i in range(4)]
    res = optimize.minimize(lambda b: -iou(b), start, method="Nelder-Mead",
                            options=dict(initial_simplex=simplex, xatol=0.1,
                                         fatol=1e-6, maxiter=800))
    return list(res.x), -res.fun


def warp_to_mercator(src: np.ndarray, box: list[float]):
    """Resample src (RGBA, UTM box) onto a Web Mercator grid."""
    sh, sw = src.shape[:2]
    x0, y0, x1, y1 = box
    corners = [utm_inverse(x, y) for x in (x0, x1) for y in (y0, y1)]
    lons = [c[0] for c in corners]
    lats = [c[1] for c in corners]
    west, east, south, north = min(lons), max(lons), min(lats), max(lats)

    out_w = min(SERVING_WIDTH, sw)
    out_h = round(out_w * (merc_y(north) - merc_y(south)) / (east - west))

    lon = west + (np.arange(out_w) + 0.5) / out_w * (east - west)
    my = merc_y(north) - (np.arange(out_h) + 0.5) / out_h * (merc_y(north) - merc_y(south))
    lon_g, lat_g = np.meshgrid(lon, merc_lat(my))
    ux, uy = utm_forward(lon_g, lat_g)
    col = (ux - x0) / (x1 - x0) * sw - 0.5
    row = (y1 - uy) / (y1 - y0) * sh - 0.5

    # Premultiply so bilinear edges fade to transparent, not to black.
    alpha = src[:, :, 3].astype(np.float32) / 255
    out = np.zeros((out_h, out_w, 4), np.float32)
    out[:, :, 3] = ndimage.map_coordinates(alpha, [row, col], order=1, cval=0)
    for ch in range(3):
        out[:, :, ch] = ndimage.map_coordinates(src[:, :, ch] * alpha, [row, col],
                                                order=1, cval=0)
    a = out[:, :, 3]
    rgb = np.where(a[..., None] > 0, out[:, :, :3] / np.maximum(a, 1e-6)[..., None], 0)
    img = np.dstack([np.clip(rgb, 0, 255), a * 255]).round().astype(np.uint8)
    return img, (west, south, east, north)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true", help=f"rewrite {SERVED}")
    args = ap.parse_args()

    src = np.array(Image.open(ORIGINAL).convert("RGBA"))
    box, score = fit_utm_extent(src[:, :, 3])
    px = ((box[2] - box[0]) / src.shape[1], (box[3] - box[1]) / src.shape[0])
    print(f"UTM 42N extent  {', '.join(f'{v:.2f}' for v in box)}")
    print(f"fit IoU {score:.4f}, pixel {px[0]:.3f} x {px[1]:.3f} m")

    img, (w, s, e, n) = warp_to_mercator(src, box)
    print(f"served {img.shape[1]}x{img.shape[0]}")
    print(f"bounds  {w:.7f}, {s:.7f}, {e:.7f}, {n:.7f}")
    if args.write:
        Image.fromarray(img, "RGBA").save(SERVED, optimize=True)
        print(f"wrote {SERVED}")


if __name__ == "__main__":
    main()
