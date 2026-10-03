-- Current Land Use (Drone: 2026): the client's 2026 figures, the 2026 column
-- of the LULC sheet (LULC.xlsx), replacing those from LULC Drone.xlsx.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/030-current-land-use-2026-statistics.sql
--
-- Idempotent: lulc_2026's rows are replaced wholesale.

BEGIN;
DELETE FROM overlay_class_stats s USING static_overlays o
WHERE s.overlay_id = o.id AND o.key = 'lulc_2026';

INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.label, v.class_group, v.area_ha, v.percentage, v.sort_order
FROM (VALUES
    ('lulc_2026', '1', 'Barren', NULL, 377.06, 11.11, 1),
    ('lulc_2026', '2', 'Builtup', NULL, 10.92, 0.32, 2),
    ('lulc_2026', '3', 'Dense Vegetation', NULL, 911.81, 26.87, 3),
    ('lulc_2026', '4', 'Scrub / Sparse Vegetation', NULL, 2092.67, 61.67, 4),
    ('lulc_2026', '5', 'Waterbody', NULL, 1.14, 0.03, 5)
) AS v (key, class_value, label, class_group, area_ha, percentage, sort_order)
JOIN static_overlays o ON o.key = v.key;
COMMIT;
