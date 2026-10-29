-- Aspect goes back to one continuous raster (one on/off switch, no
-- per-direction toggling), replacing the nine aspectCat1-9 class masks
-- 071-slope-aspect-categories.sql introduced. Slope is untouched — still a
-- multi_raster group of five class masks.
--
-- legend-config.ts's `aspect` entry is restored alongside this (same
-- values/colours the aspectCat* rows carried), so the legend shows the same
-- 9-class key it does today. Restates init.sql; apply to an existing
-- database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/084-aspect-single-raster.sql
--
-- Idempotent: the DELETE matches nothing once run, multi_raster is set
-- unconditionally, and the INSERT is ON CONFLICT DO UPDATE by key.

BEGIN;

UPDATE layer_groups SET multi_raster = false WHERE key = 'aspect';

DELETE FROM static_overlays WHERE key LIKE 'aspectCat%';

INSERT INTO static_overlays (key, label, group_id, asset_type, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT 'aspect', 'Aspect', id, 'raster', 'raster-data/Aspect.pmtiles', 1, 71.7271993, 21.4507049, 71.8234229, 21.5119052
FROM layer_groups WHERE key = 'aspect'
ON CONFLICT (key) DO UPDATE SET
    group_id = EXCLUDED.group_id, asset_type = EXCLUDED.asset_type, file_path = EXCLUDED.file_path,
    sort_order = EXCLUDED.sort_order, min_lon = EXCLUDED.min_lon, min_lat = EXCLUDED.min_lat,
    max_lon = EXCLUDED.max_lon, max_lat = EXCLUDED.max_lat, color = NULL;

COMMIT;
