-- The client's vector legend colours:
--   Dyke #289acc, Lineament #ff0000, Greenwash #00340a, Fireline #fa8609
--   (dotted), Geomorphology and Geology per class.
-- Fireline's dotted line is the new static_overlays.dotted flag, so which
-- layer draws dotted stays a row, not a key check in the frontend.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/019-vector-legend-colors.sql
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, and plain UPDATEs by key.

ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS dotted BOOLEAN NOT NULL DEFAULT false;

UPDATE static_overlays SET color = '#289acc' WHERE key = 'dyke';
UPDATE static_overlays SET color = '#ff0000' WHERE key = 'lineament';
UPDATE static_overlays SET color = '#00340a' WHERE key = 'greenwash';
UPDATE static_overlays SET color = '#fa8609', dotted = true WHERE key = 'fireline';

UPDATE static_overlays SET color = '#e77aae', color_field = 'descriptio',
    categories = '[
        {"value": "Moderately Dissected Denudational Hills and Valleys", "label": "Moderately Dissected Denudational Hills and Valleys", "color": "#e7ba9f"},
        {"value": "Moderately Dissected Structural Lower Plateau", "label": "Moderately Dissected Structural Lower Plateau", "color": "#e77aae"},
        {"value": "Pediment Pediplain Complex", "label": "Pediment Pediplain Complex", "color": "#fffd45"}
    ]'::jsonb
WHERE key = 'geomorphology';

UPDATE static_overlays SET color = '#bb856c', color_field = 'lithologic',
    categories = '[
        {"value": "PAHOEHOE BASALT", "label": "Pahoehoe Basalt", "color": "#bb856c"},
        {"value": "SAND, SILT AND CLAY", "label": "Sand, Silt and Clay", "color": "#b2bf74"}
    ]'::jsonb
WHERE key = 'geology';
