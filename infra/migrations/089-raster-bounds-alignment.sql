-- Growing Stock (and its two siblings, Tree Density and Habitat Suitability)
-- were re-fitted to the study area's outline back in #45
-- (tools/prepare-study-area-rasters.py), which edited init.sql's bounds but
-- never shipped a migration for it -- so any database provisioned before
-- that PR is still serving the old, looser orthomosaic-footprint bounds
-- (from migration 004), and the raster sits north/east of where the study
-- area boundary actually is. This restates init.sql's current values.
--
-- Apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/089-raster-bounds-alignment.sql
--
-- Idempotent: a plain UPDATE by key.

BEGIN;

UPDATE static_overlays SET
    min_lon = 71.7265374, min_lat = 21.4503739, max_lon = 71.8243556, max_lat = 21.5128380
WHERE key = 'treeDensity';

UPDATE static_overlays SET
    min_lon = 71.7284712, min_lat = 21.4519605, max_lon = 71.8218126, max_lat = 21.5120078
WHERE key = 'growingStock';

UPDATE static_overlays SET
    min_lon = 71.7289941, min_lat = 21.4522722, max_lon = 71.8216515, max_lat = 21.5119033
WHERE key = 'habitatSuitability';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key, min_lon, min_lat, max_lon, max_lat FROM static_overlays
--   WHERE key IN ('treeDensity', 'growingStock', 'habitatSuitability');
