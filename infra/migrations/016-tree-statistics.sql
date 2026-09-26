-- Tree Statistics: replaces Tree Height, Tree Species and the pending Carbon
-- Stock Estimates with one layer. A nested 'tree-statistics' group under Drone
-- Analysis holds two rows, the trees (height, species and carbon per tree) and
-- the grid their totals are summarised over; the group's one switch turns on
-- both. See init.sql for how the files were built from the delivered parquet.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/016-tree-statistics.sql
--
-- Idempotent: the DELETE matches nothing once run, the INSERTs are
-- ON CONFLICT DO NOTHING, and the UPDATE is a plain set by key.

BEGIN;

DELETE FROM static_overlays WHERE key IN ('treeHeight', 'treeSpecies', 'carbonStock');

INSERT INTO layer_groups (key, label, parent_id, sort_order)
SELECT 'tree-statistics', 'Tree Statistics', id, 3 FROM layer_groups WHERE key = 'drone-analysis'
ON CONFLICT (key) DO NOTHING;

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, file_path, sort_order, min_lon, min_lat, max_lon, max_lat, popup_fields) VALUES
    ('treeGrid',       'Grid',  grp('tree-statistics'), 'vector', 'outline', '#FFFFFF', 'vector-data/tree-grid.geojson',        1, 71.728476, 21.451971, 71.821823, 21.512008,
        '{GridNum,Zone,Total_Tree_Count,Total_Tree_Species,Total_Carbon_Tonnes,Carbon_Density_t_ha}'),
    ('treeStatistics', 'Trees', grp('tree-statistics'), 'vector', 'point',   '#bab0ac', 'vector-data/tree-statistics.pmtiles', 2, 71.728574, 21.451984, 71.821788, 21.511942,
        '{Tree_ID,Predicted_SN,Max_Height,True_Heigh,Carbon_kg,GridNum}')
ON CONFLICT (key) DO NOTHING;

UPDATE static_overlays SET color_field = 'Predicted_SN',
    categories = '[
        {"value": "Butea monosperma", "label": "Butea monosperma", "color": "#f28e2b"},
        {"value": "Senegalia senegal", "label": "Senegalia senegal", "color": "#4e79a7"},
        {"value": "Dichrostachys cinerea", "label": "Dichrostachys cinerea", "color": "#e15759"},
        {"value": "Acacia nilotica", "label": "Acacia nilotica", "color": "#76b7b2"},
        {"value": "Ficus benjamina L.", "label": "Ficus benjamina", "color": "#59a14f"},
        {"value": "Anogeissus latifolia", "label": "Anogeissus latifolia", "color": "#edc948"},
        {"value": "Azadirachta indica", "label": "Azadirachta indica", "color": "#b07aa1"},
        {"value": "Prosopis juliflora", "label": "Prosopis juliflora", "color": "#ff9da7"},
        {"value": "Boswellia serrata", "label": "Boswellia serrata", "color": "#9c755f"},
        {"value": "Mangifera indica", "label": "Mangifera indica", "color": "#17becf"},
        {"value": "Other", "label": "Other species", "color": "#bab0ac"}
    ]'::jsonb
WHERE key = 'treeStatistics';

COMMIT;
