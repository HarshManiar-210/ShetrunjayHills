-- Delivers Wildlife Corridors as a raster (was a 'pending' vector row directly
-- under Wildlife Movement). A group holding a raster becomes that one raster
-- layer, so it gets its own group beside Habitat Suitability, and takes
-- Habitat Suitability's extent.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/012-wildlife-corridors-raster.sql
--
-- Idempotent: ON CONFLICT DO NOTHING, then a plain UPDATE by key.

BEGIN;

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT 'wildlife-corridors', 'Wildlife Corridors', id, 2 FROM layer_groups WHERE key = 'wildlife-movement'
ON CONFLICT (key) DO NOTHING;

UPDATE static_overlays SET
    group_id = (SELECT id FROM layer_groups WHERE key = 'wildlife-corridors'),
    asset_type = 'raster', kind = NULL, color = NULL, status = 'available', sort_order = 1,
    file_path = 'raster-data/wildlifecorridor.png',
    min_lon = 71.7287438236, min_lat = 21.4516896641, max_lon = 71.8221861880, max_lat = 21.5128519390
WHERE key = 'wildlifeCorridors';

COMMIT;
