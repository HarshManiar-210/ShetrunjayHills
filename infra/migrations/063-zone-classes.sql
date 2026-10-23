-- Zones (Admin Boundaries): classified by ZName in the client's six zone
-- colours with white outlines. See init.sql.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/063-zone-classes.sql
--
-- Idempotent: a plain UPDATE by key. Needs 061 (fill_opacity, outline_color).
UPDATE static_overlays SET kind = 'fill', fill_opacity = 0.5, outline_color = '#ffffff', color = '#d129d1',
    color_field = 'ZName', categories = '[
        {"value": "Zone I – Main Temple Ridge", "label": "Zone I – Main Temple Ridge", "color": "#d129d1"},
        {"value": "Zone II – Jivapar–Rohishala Escarpment", "label": "Zone II – Jivapar–Rohishala Escarpment", "color": "#cf863b"},
        {"value": "Zone III – Ghetipag Escarpment", "label": "Zone III – Ghetipag Escarpment", "color": "#53dc51"},
        {"value": "Zone  IV – Six-Gau Ridge", "label": "Zone IV – Six-Gau Ridge", "color": "#e8f26d"},
        {"value": "Zone V – Khodiyar–Gheti plateau", "label": "Zone V – Khodiyar–Gheti plateau", "color": "#5acab9"},
        {"value": "Zone VI – Kanjarda Hill Complex", "label": "Zone VI – Kanjarda Hill Complex", "color": "#5208b5"}
    ]'::jsonb
WHERE key = 'zones';
