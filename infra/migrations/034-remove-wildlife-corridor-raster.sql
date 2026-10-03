-- Wildlife Corridors: drop the raster (raster-data/wildlifecorridor.png) and
-- keep only the corridor lines, vector-data/WildlifeCorridor.geojson
-- (wildlifeCorridorLines), which stay in the wildlife-corridors group.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/034-remove-wildlife-corridor-raster.sql
--
-- Idempotent: deleting a row that is already gone does nothing. Its
-- overlay_class_stats rows, if any, go with it (ON DELETE CASCADE).

BEGIN;
DELETE FROM static_overlays WHERE key = 'wildlifeCorridors';
COMMIT;
