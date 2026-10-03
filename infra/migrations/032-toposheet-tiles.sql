-- Toposheet: serve it as a PMTiles archive of lossless WebP tiles instead of
-- one 70 MB PNG. The browser then fetches only the 256 px tiles in view rather
-- than downloading and decoding the whole sheet before anything draws, and
-- the layer no longer trips the 50 MB large-layer warning. Built from the
-- same PNG by tools/prepare-raster-tiles.sh (SRC_GRID=3857, lossless, zooms
-- 8-15; zoom 15 holds every pixel of the ~7 m scan). Lossless because lossy
-- WebP halves colour resolution, which visibly softened the sheet's thin red
-- and blue linework.
--
-- Clipped to the client's extent for the layer, EPSG:4326
-- 71.707074,21.416648 : 71.874999,21.583427 (CLIP= in that script) -- a
-- window around the study area rather than the whole 0.5 degree sheet, cut
-- at the sheet's own pixels, so its placement is unchanged. The API stamps `tiled` from the
-- .pmtiles extension, so nothing else changes.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/032-toposheet-tiles.sql
--
-- Idempotent: a plain UPDATE by key.

BEGIN;
UPDATE static_overlays SET file_path = 'raster-data/toposheet.pmtiles',
    min_lon = 71.707074, min_lat = 21.416648, max_lon = 71.874999, max_lat = 21.583427
WHERE key = 'toposheet';
COMMIT;
