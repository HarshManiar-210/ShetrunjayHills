-- Field Plots: a vector row seeded beside the Growing Stock raster, so the
-- theme's one switch draws the plots on top of the image. A solid line whose
-- popup shows the plot number (Name). Restates init.sql; apply to an existing
-- database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/052-field-plots.sql
--
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, file_path, sort_order, min_lon, min_lat, max_lon, max_lat, popup_fields, solid, line_width) VALUES
    ('fieldPlots', 'Field Plots', grp('growing-stock'), 'vector', 'line', '#FFFFFF', 'vector-data/FieldPlots.geojson', 2, 71.734647, 21.456098, 71.820704, 21.510483, '{"Name:Plot Number"}', true, 2)
ON CONFLICT (key) DO NOTHING;
