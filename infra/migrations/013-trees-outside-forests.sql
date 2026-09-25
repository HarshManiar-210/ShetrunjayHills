-- Delivers TOF (Trees Outside Forests), was 'pending': 212,969 tree polygons
-- served as PMTiles, coloured by TOF_Class. See init.sql for how the archive
-- was built from TreeOutsideForest.parquet.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/013-trees-outside-forests.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET kind = 'fill', color = '#875400', status = 'available',
    color_field = 'TOF_Class',
    categories = '[
        {"value": "Block TOF", "label": "Block TOF", "color": "#234f1a"},
        {"value": "Built-up TOF", "label": "Built-up TOF", "color": "#00ffeb"},
        {"value": "Linear TOF", "label": "Linear TOF", "color": "#ffff00"},
        {"value": "Scattered TOF", "label": "Scattered TOF", "color": "#875400"}
    ]'::jsonb,
    popup_fields = '{TOF_Class,Max_Height}',
    file_path = 'vector-data/tree-outside-forest.pmtiles',
    min_lon = 71.730263, min_lat = 21.464732, max_lon = 71.822354, max_lat = 21.512495
WHERE key = 'treesOutsideForests';
