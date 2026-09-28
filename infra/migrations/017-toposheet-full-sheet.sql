-- Toposheet: the new delivery covers the full sheet extent
-- (71.499945, 21.249988 : 72.000122, 21.750008, EPSG:4326) rather than the
-- study area. Resampled from UTM 42N by tools/prepare-study-area-rasters.py;
-- these are its new bounds.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/017-toposheet-full-sheet.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon = 71.4870089, min_lat = 21.2403840, max_lon = 72.0156875, max_lat = 21.7609689
WHERE key = 'toposheet';
