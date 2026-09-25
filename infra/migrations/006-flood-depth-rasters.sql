-- Flood Depth: replaces the 'floodDepth' pending placeholder (a single vector
-- row under Hydrogeology) with five delivered flood-extent rasters (0.5/1/2/5
-- /10 m), each its own group since each level's four colour classes cover
-- different depth ranges and so can't share one legend (see
-- lib/legend-config.ts's flood-0-5m/flood-1m/flood-2m/flood-5m/flood-10m
-- entries) -- same one-raster-per-group pattern as Tree Density/Growing
-- Stock.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/006-flood-depth-rasters.sql
--
-- Idempotent: the DELETE matches nothing once run, and the INSERTs are
-- ON CONFLICT DO NOTHING keyed off each row's unique key, so running this
-- twice (or against a fresh database already seeded from the updated
-- init.sql) is a no-op the second time.

BEGIN;

DELETE FROM static_overlays WHERE key = 'floodDepth';

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT 'flood-depth', 'Flood Depth (m)', id, 3 FROM layer_groups WHERE key = 'hydrogeology'
ON CONFLICT (key) DO NOTHING;

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT v.key, v.label, (SELECT id FROM layer_groups WHERE key = 'flood-depth'), v.sort_order
FROM (VALUES
    ('flood-0-5m', '0.5 Meter Flood', 1),
    ('flood-1m',   '1 Meter Flood',   2),
    ('flood-2m',   '2 Meter Flood',   3),
    ('flood-5m',   '5 Meter Flood',   4),
    ('flood-10m',  '10 Meter Flood',  5)
) AS v(key, label, sort_order)
ON CONFLICT (key) DO NOTHING;

INSERT INTO static_overlays (key, label, group_id, asset_type, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT v.key, v.label, (SELECT id FROM layer_groups WHERE key = v.group_key), 'raster', v.file_path, 1, 71.7282, 21.4169, 71.8245, 21.4756
FROM (VALUES
    ('flood0_5m', '0.5 Meter Flood', 'flood-0-5m', 'raster-data/flood/0_5MeterFlood.png'),
    ('flood1m',   '1 Meter Flood',   'flood-1m',   'raster-data/flood/1MeterFlood.png'),
    ('flood2m',   '2 Meter Flood',   'flood-2m',   'raster-data/flood/2MeterFlood.png'),
    ('flood5m',   '5 Meter Flood',   'flood-5m',   'raster-data/flood/5MeterFlood.png'),
    ('flood10m',  '10 Meter Flood',  'flood-10m',  'raster-data/flood/10MeterFlood.png')
) AS v(key, label, group_key, file_path)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key FROM static_overlays WHERE key = 'floodDepth'; -- 0 rows
--   SELECT key, label, file_path FROM static_overlays
--    WHERE key LIKE 'flood%' ORDER BY key; -- 5 rows
