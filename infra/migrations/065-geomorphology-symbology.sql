-- Geomorphology (GSI layer): solid fills per landform with black outlines,
-- per the client's symbology. See init.sql.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/065-geomorphology-symbology.sql
--
-- Idempotent: a plain UPDATE by key. Needs 061 (fill_opacity, outline_color).
UPDATE static_overlays SET kind = 'fill', fill_opacity = 1, outline_color = '#000000', solid = true,
    color = '#d07151', categories = '[
        {"value": "Moderately Dissected Denudational Hills and Valleys", "label": "Moderately Dissected Denudational Hills and Valleys", "color": "#d07151"},
        {"value": "Moderately Dissected Structural Lower Plateau", "label": "Moderately Dissected Structural Lower Plateau", "color": "#7ad8e7"},
        {"value": "Pediment Pediplain Complex", "label": "Pediment Pediplain Complex", "color": "#fffd45"}
    ]'::jsonb
WHERE key = 'geomorphology';
