-- Geology (GSI layer): solid fills per lithology with 0.46 mm black outlines,
-- per the client's symbology. See init.sql.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/064-geology-symbology.sql
--
-- Idempotent: a plain UPDATE by key. Needs 061 (fill_opacity, outline_color).
UPDATE static_overlays SET kind = 'fill', fill_opacity = 1, outline_color = '#000000', line_width = 1.74,
    solid = true, color = '#a26b0b', categories = '[
        {"value": "PAHOEHOE BASALT", "label": "Pahoehoe Basalt", "color": "#a26b0b"},
        {"value": "SAND, SILT AND CLAY", "label": "Sand, Silt and Clay", "color": "#8cf64f"}
    ]'::jsonb
WHERE key = 'geology';
