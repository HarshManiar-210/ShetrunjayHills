-- Green Cover (Yearwise): the client's official area and share of Green /
-- Non-Green Cover per year. The Statistics panel shows these instead of
-- measuring the imagery (see overlay_class_stats in
-- infra/postgis-init/init.sql). Class values are the theme's legend values in
-- apps/web/lib/legend-config.ts: 2 the green class, 1 the rest.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/029-green-cover-class-stats.sql
--
-- Idempotent: the Green Cover rows are replaced wholesale.

BEGIN;
DELETE FROM overlay_class_stats s USING static_overlays o
WHERE s.overlay_id = o.id AND o.key LIKE 'green_cover_%';

INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.label, v.class_group, v.area_ha, v.percentage, v.sort_order
FROM (VALUES
    ('green_cover_1980', '2', 'Green Cover', NULL, 2980.39, 87.82, 1),
    ('green_cover_1980', '1', 'Non-Green Cover', NULL, 413.21, 12.18, 2),
    ('green_cover_1989', '2', 'Green Cover', NULL, 2820.49, 83.11, 1),
    ('green_cover_1989', '1', 'Non-Green Cover', NULL, 573.11, 16.89, 2),
    ('green_cover_1998', '2', 'Green Cover', NULL, 2782.88, 82, 1),
    ('green_cover_1998', '1', 'Non-Green Cover', NULL, 610.72, 18, 2),
    ('green_cover_2008', '2', 'Green Cover', NULL, 2844.73, 83.83, 1),
    ('green_cover_2008', '1', 'Non-Green Cover', NULL, 548.88, 16.17, 2),
    ('green_cover_2018', '2', 'Green Cover', NULL, 2922.15, 86.11, 1),
    ('green_cover_2018', '1', 'Non-Green Cover', NULL, 471.45, 13.89, 2),
    ('green_cover_2025', '2', 'Green Cover', NULL, 3214.95, 94.74, 1),
    ('green_cover_2025', '1', 'Non-Green Cover', NULL, 178.65, 5.26, 2),
    ('green_cover_2026', '2', 'Green Cover', NULL, 2979.48, 87.8, 1),
    ('green_cover_2026', '1', 'Non-Green Cover', NULL, 414.12, 12.2, 2)
) AS v (key, class_value, label, class_group, area_ha, percentage, sort_order)
JOIN static_overlays o ON o.key = v.key;
COMMIT;
