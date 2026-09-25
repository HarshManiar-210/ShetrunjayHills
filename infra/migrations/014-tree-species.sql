-- Delivers Tree Species, was 'pending': 822,994 trees served as PMTiles,
-- coloured by the ten most common species with the rest as "Other species".
-- See init.sql for how the archive was built from Tree_Statistics.parquet.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/014-tree-species.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET kind = 'point', color = '#bab0ac', status = 'available',
    file_path = 'vector-data/tree-species.pmtiles',
    min_lon = 71.728574, min_lat = 21.451984, max_lon = 71.821788, max_lat = 21.511942,
    color_field = 'Predicted_SN', popup_fields = '{Predicted_SN,Max_Height,Carbon_kg}',
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
WHERE key = 'treeSpecies';
