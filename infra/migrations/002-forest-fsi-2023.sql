-- Forest Survey of India (FSI) 2023 vector layers: Forest Cover and Forest
-- Type, each a categorical polygon layer (a `Type` property per feature)
-- rather than the flat single-colour vector overlays seeded so far.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the ALTER + INSERT below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/002-forest-fsi-2023.sql
--
-- Idempotent: the ALTERs are IF NOT EXISTS and the INSERTs are ON CONFLICT
-- DO NOTHING keyed off the overlay's unique `key`, so running this twice (or
-- against a fresh database that already has these rows from init.sql) is a
-- no-op the second time.

BEGIN;

ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS color_field TEXT;
ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS categories JSONB;

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, color_field, categories, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT 'forestCoverFSI', 'Forest Cover FSI 2023', id, 'vector', 'fill', '#b4d862', 'Type', '[
        {"value": "MODERATELY DENSE FOREST (Tree Canopy density 40% & above but < 70%)", "label": "Moderately Dense Forest", "color": "#1e641e"},
        {"value": "OPEN FOREST (Tree Canopy density 10% & above but < 40%)", "label": "Open Forest", "color": "#b4d862"},
        {"value": "SCRUB (Tree Canopy density < 10%)", "label": "Scrub", "color": "#ff0000"},
        {"value": "WATER", "label": "Water", "color": "#2839c9"}
    ]'::jsonb, 'vector-data/forest-cover-FSI.geojson', 7, 71.729094, 21.451799, 71.821913, 21.511363
FROM layer_groups WHERE key = 'forest-layers'
ON CONFLICT (key) DO NOTHING;

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, color_field, categories, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT 'forestTypeFSI', 'Forest Type FSI 2023', id, 'vector', 'fill', '#20c0d9', 'Type', '[
        {"value": "3B/C2 Southern moist mixed deciduous forest", "label": "3B/C2 Southern moist mixed deciduous forest", "color": "#ea808f"},
        {"value": "5/DS4 Dry Grassland", "label": "5/DS4 Dry Grassland", "color": "#cd81e2"},
        {"value": "5/E 8c Salvadora-T amarix scrub", "label": "5/E 8c Salvadora-Tamarix scrub", "color": "#17e48f"},
        {"value": "5/E1 Anogeissus pendula Forest", "label": "5/E1 Anogeissus pendula Forest", "color": "#20c0d9"},
        {"value": "6/E4 Salvadora scrub", "label": "6/E4 Salvadora scrub", "color": "#eaaa7d"},
        {"value": "Acacia senegal forest", "label": "Acacia senegal forest", "color": "#a0eb55"},
        {"value": "Water", "label": "Water", "color": "#00206d"}
    ]'::jsonb, 'vector-data/forest-type-FSI.geojson', 8, 71.728918, 21.451784, 71.821736, 21.511611
FROM layer_groups WHERE key = 'forest-layers'
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- What the two rows read afterwards, for checking by eye:
--   SELECT key, label, color_field, jsonb_array_length(categories) FROM static_overlays
--    WHERE key IN ('forestCoverFSI', 'forestTypeFSI');
