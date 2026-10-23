-- CHM (Canopy Height Model): update extent and file path to newly delivered
-- classified CHM raster (raster-data/CHM.png).
-- Bounds match the client's delivery (71.727066, 21.452069 : 71.823365, 21.512053).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/060-update-chm-and-legends.sql
--
-- Idempotent: plain UPDATE by key.

BEGIN;

UPDATE static_overlays SET
    file_path = 'raster-data/CHM.png',
    min_lon = 71.727066,
    min_lat = 21.452069,
    max_lon = 71.823365,
    max_lat = 21.512053
WHERE key = 'chm';

COMMIT;
