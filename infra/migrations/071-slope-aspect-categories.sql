-- Slope/Aspect, re-delivered as one raster per class (Flat/Gentle/.../Very
-- Steep; North/North East/.../North West) instead of one continuous image,
-- so each class can be switched on or off independently while the others
-- stay on screen. See init.sql's layer_groups.multi_raster column and the
-- slopeCat*/aspectCat* static_overlays rows for the full picture.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/071-slope-aspect-categories.sql
--
-- Idempotent: column added if missing, old rows deleted by key, new rows
-- upserted by key.

BEGIN;

ALTER TABLE layer_groups ADD COLUMN IF NOT EXISTS multi_raster BOOLEAN NOT NULL DEFAULT false;
UPDATE layer_groups SET multi_raster = true WHERE key IN ('slope', 'aspect');

DELETE FROM static_overlays WHERE key IN ('slope', 'aspect');

INSERT INTO static_overlays (key, label, group_id, asset_type, color, file_path, sort_order, min_lon, min_lat, max_lon, max_lat) VALUES
    ('slopeCat1', 'Flat (0° – 8.24°)',           (SELECT id FROM layer_groups WHERE key = 'slope'), 'raster', '#2c7bb6', 'raster-data/slope-categories/Slope_Cat1.pmtiles', 1, 71.7271993, 21.4507049, 71.8234530, 21.5119052),
    ('slopeCat2', 'Gentle (8.24° – 15.82°)',      (SELECT id FROM layer_groups WHERE key = 'slope'), 'raster', '#abd9e9', 'raster-data/slope-categories/Slope_Cat2.pmtiles', 2, 71.7271993, 21.4507049, 71.8234530, 21.5119052),
    ('slopeCat3', 'Moderate (15.82° – 25.56°)',   (SELECT id FROM layer_groups WHERE key = 'slope'), 'raster', '#ffffbf', 'raster-data/slope-categories/Slope_Cat3.pmtiles', 3, 71.7271993, 21.4507049, 71.8234530, 21.5119052),
    ('slopeCat4', 'Steep (25.56° – 60.25°)',      (SELECT id FROM layer_groups WHERE key = 'slope'), 'raster', '#fdae61', 'raster-data/slope-categories/Slope_Cat4.pmtiles', 4, 71.7271993, 21.4507049, 71.8234530, 21.5119052),
    ('slopeCat5', 'Very Steep (60.25° – 88.13°)', (SELECT id FROM layer_groups WHERE key = 'slope'), 'raster', '#d7191c', 'raster-data/slope-categories/Slope_Cat5.pmtiles', 5, 71.7271993, 21.4507049, 71.8234530, 21.5119052),

    ('aspectCat1', 'North (0° – 22.5°)',          (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#30123b', 'raster-data/aspect-categories/Aspect_Cat1.pmtiles', 1, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat2', 'North East (22.5° – 67.5°)',  (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#466be3', 'raster-data/aspect-categories/Aspect_Cat2.pmtiles', 2, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat3', 'East (67.5° – 112.5°)',       (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#28bceb', 'raster-data/aspect-categories/Aspect_Cat3.pmtiles', 3, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat4', 'South East (112.5° – 157.5°)',(SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#32f298', 'raster-data/aspect-categories/Aspect_Cat4.pmtiles', 4, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat5', 'South (157.5° – 202.5°)',     (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#a4fc3c', 'raster-data/aspect-categories/Aspect_Cat5.pmtiles', 5, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat6', 'South West (202.5° – 247.5°)',(SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#eecf3a', 'raster-data/aspect-categories/Aspect_Cat6.pmtiles', 6, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat7', 'West (247.5° – 292.5°)',      (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#fb7e21', 'raster-data/aspect-categories/Aspect_Cat7.pmtiles', 7, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat8', 'North West (292.5° – 337.5°)',(SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#d02f05', 'raster-data/aspect-categories/Aspect_Cat8.pmtiles', 8, 71.7271993, 21.4507049, 71.8234229, 21.5119052),
    ('aspectCat9', 'North (337.5° – 360°)',       (SELECT id FROM layer_groups WHERE key = 'aspect'), 'raster', '#30123b', 'raster-data/aspect-categories/Aspect_Cat9.pmtiles', 9, 71.7271993, 21.4507049, 71.8234229, 21.5119052)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label, group_id = EXCLUDED.group_id, asset_type = EXCLUDED.asset_type,
    color = EXCLUDED.color, file_path = EXCLUDED.file_path, sort_order = EXCLUDED.sort_order,
    min_lon = EXCLUDED.min_lon, min_lat = EXCLUDED.min_lat, max_lon = EXCLUDED.max_lon, max_lat = EXCLUDED.max_lat;

COMMIT;
