-- Flood Depth: replaces the 'floodDepth' pending placeholder (a single vector
-- row under Hydrogeology) with one raster theme -- Forest/Green Cover's
-- Yearwise pattern, but the picker chooses a simulated depth (0.5/1/2/5/10 m)
-- instead of a year. Each depth's four colour classes cover different ranges
-- (see lib/legend-config.ts's flood0_5m/flood1m/flood2m/flood5m/flood10m
-- entries, resolved by the selected image's own key, not the theme's --
-- legendFor's imageKey param), so unlike a normal Yearwise theme the legend
-- has to follow which image is on screen.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/006-flood-depth-rasters.sql
--
-- Idempotent: the DELETEs match nothing once run, and the INSERTs are
-- ON CONFLICT DO NOTHING keyed off each row's unique key, so running this
-- twice (or against a fresh database already seeded from the updated
-- init.sql) is a no-op the second time.

BEGIN;

DELETE FROM static_overlays WHERE key = 'floodDepth';

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT 'flood-depth', 'Flood Depth (m)', id, 1 FROM layer_groups WHERE key = 'hydrogeology'
ON CONFLICT (key) DO NOTHING;

INSERT INTO static_overlays (key, label, group_id, asset_type, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT v.key, v.label, (SELECT id FROM layer_groups WHERE key = 'flood-depth'), 'raster', v.file_path, v.sort_order, 71.7282, 21.4169, 71.8245, 21.4756
FROM (VALUES
    ('flood0_5m', '0.5', 'raster-data/flood/0_5MeterFlood.png', 1),
    ('flood1m',   '1',   'raster-data/flood/1MeterFlood.png',   2),
    ('flood2m',   '2',   'raster-data/flood/2MeterFlood.png',   3),
    ('flood5m',   '5',   'raster-data/flood/5MeterFlood.png',   4),
    ('flood10m',  '10',  'raster-data/flood/10MeterFlood.png',  5)
) AS v(key, label, file_path, sort_order)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key FROM static_overlays WHERE key = 'floodDepth'; -- 0 rows
--   SELECT key, label, file_path FROM static_overlays
--    WHERE key LIKE 'flood%' ORDER BY sort_order; -- 5 rows, one group_id
