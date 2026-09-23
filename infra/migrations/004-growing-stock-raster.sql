-- Growing Stock is delivered now, as a raster (raster-data/growingstock.png)
-- rather than the vector placeholder it was seeded as. It gets its own group
-- under Drone Analysis, same reason Tree Density has one: a group holding a
-- placed raster becomes a single layer with no room for siblings. Tree Count
-- is dropped — Claude Code removed it from the Drone Analysis section.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/004-growing-stock-raster.sql
--
-- Idempotent: the DELETE and UPDATE match nothing the second time, and the
-- group insert is ON CONFLICT DO NOTHING.

BEGIN;

DELETE FROM static_overlays WHERE key = 'treeCount';

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT 'growing-stock', 'Growing Stock', id, 2 FROM layer_groups WHERE key = 'drone-analysis'
ON CONFLICT (key) DO NOTHING;

-- Tight-cropped to the flight footprint, so it takes the Orthomosaic's
-- bounds — same reasoning as Tree Density's row.
UPDATE static_overlays SET
    asset_type = 'raster',
    kind = NULL,
    color = NULL,
    group_id = (SELECT id FROM layer_groups WHERE key = 'growing-stock'),
    file_path = 'raster-data/growingstock.png',
    status = 'available',
    min_lon = 71.7265374, min_lat = 21.4548350, max_lon = 71.8243556, max_lat = 21.5129591
WHERE key = 'growingStock';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key FROM static_overlays WHERE key = 'treeCount'; -- 0 rows
--   SELECT key, asset_type, status, file_path FROM static_overlays WHERE key = 'growingStock';
