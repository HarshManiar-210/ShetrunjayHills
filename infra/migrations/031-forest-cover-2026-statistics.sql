-- Forest Cover (Yearwise) 2026: the client's official class figures, the
-- 2026 column of Forest Cover.xlsx. Until now 2026 had none, so the
-- Statistics panel measured it from the image; it now shows these instead.
-- 1980-2025 were already seeded and match the same sheet.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/031-forest-cover-2026-statistics.sql
--
-- Idempotent: forest_cover_2026's rows are replaced wholesale.

BEGIN;
DELETE FROM overlay_class_stats s USING static_overlays o
WHERE s.overlay_id = o.id AND o.key = 'forest_cover_2026';

INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.label, v.class_group, v.area_ha, v.percentage, v.sort_order
FROM (VALUES
    ('forest_cover_2026', '1', 'Very Dense Forest', NULL, 501.01, 14.76, 1),
    ('forest_cover_2026', '2', 'Moderately Dense Forest', NULL, 519.27, 15.3, 2),
    ('forest_cover_2026', '3', 'Open Forest', NULL, 266.2, 7.84, 3),
    ('forest_cover_2026', '4', 'Scrub', NULL, 1693, 49.89, 4),
    ('forest_cover_2026', '5', 'Non Forest', NULL, 414.12, 12.2, 5)
) AS v (key, class_value, label, class_group, area_ha, percentage, sort_order)
JOIN static_overlays o ON o.key = v.key;
COMMIT;
