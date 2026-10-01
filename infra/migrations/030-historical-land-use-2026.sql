-- Historical Land Use gains a 2026 year, and the drone LULC its own key.
--
-- The satellite-classified 2026 LULC had been seeded as lulc_2026 under
-- Current Land Use (Drone: 2026), where 027 replaced it with the drone image.
-- Its class shares are the satellite series' 2026 column (LULC.xlsx), so it
-- goes back as Historical Land Use's 2026 -- recoloured from the drone palette
-- to the historical one -- with those official figures. The drone image
-- moves to lulc_drone_2026 / lulc-drone/2026.png, keeping its own figures.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/030-historical-land-use-2026.sql
--
-- Idempotent: the drone row is renamed only while it still has the old key,
-- and the satellite row and its figures are inserted only if absent.

BEGIN;
-- The drone row keeps its id, so its overlay_class_stats rows go with it.
UPDATE static_overlays
SET key = 'lulc_drone_2026', file_path = 'raster-data/lulc-drone/2026.png'
WHERE key = 'lulc_2026'
  AND group_id = (SELECT id FROM layer_groups WHERE key = 'current-land-use');

INSERT INTO static_overlays (key, label, group_id, asset_type, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT 'lulc_2026', '2026', g.id, 'raster', 'raster-data/lulc/2026.png', 2026, 71.7280402, 21.4513279, 71.8225400, 21.5130106
FROM layer_groups g
WHERE g.key = 'historical-land-use'
ON CONFLICT (key) DO NOTHING;

INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.label, v.class_group, v.area_ha, v.percentage, v.sort_order
FROM (VALUES
    ('lulc_2026', '1', 'Barren', NULL, 377.06, 11.11, 1),
    ('lulc_2026', '2', 'Builtup', NULL, 10.92, 0.32, 2),
    ('lulc_2026', '3', 'Dense Vegetation', NULL, 911.81, 26.87, 3),
    ('lulc_2026', '4', 'Scrub / Sparse Vegetation', NULL, 2092.67, 61.67, 4),
    ('lulc_2026', '5', 'Waterbody', NULL, 1.14, 0.03, 5)
) AS v (key, class_value, label, class_group, area_ha, percentage, sort_order)
JOIN static_overlays o ON o.key = v.key
WHERE NOT EXISTS (SELECT 1 FROM overlay_class_stats s WHERE s.overlay_id = o.id);
COMMIT;
