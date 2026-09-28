-- Fragmentation: the client's new per-year delivery (a new classification),
-- placed at the EPSG:4326 extent delivered with each year rather than fitted
-- to Green Cover. See tools/prepare-study-area-rasters.py.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/022-fragmentation-new-delivery.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET min_lon = 71.727577, min_lat = 21.452491, max_lon = 71.822678, max_lat = 21.511575 WHERE key = 'fragmentation_1980';
UPDATE static_overlays SET min_lon = 71.727566, min_lat = 21.452156, max_lon = 71.822770, max_lat = 21.511847 WHERE key = 'fragmentation_1989';
UPDATE static_overlays SET min_lon = 71.727287, min_lat = 21.451914, max_lon = 71.823059, max_lat = 21.512117 WHERE key = 'fragmentation_1998';
UPDATE static_overlays SET min_lon = 71.727566, min_lat = 21.452156, max_lon = 71.822770, max_lat = 21.511847 WHERE key IN ('fragmentation_2008', 'fragmentation_2018', 'fragmentation_2025', 'fragmentation_2026');
COMMIT;
