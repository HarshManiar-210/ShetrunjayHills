-- Adds the Zones layer and renames the "Administrative Boundaries" group to
-- "Admin Boundaries". Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/036-zones-admin-layers.sql
--
-- Idempotent: the UPDATE is a set by key, the INSERT is ON CONFLICT DO NOTHING.

UPDATE layer_groups SET label = 'Admin Boundaries' WHERE key = 'administrative-boundaries';

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, file_path, sort_order, min_lon, min_lat, max_lon, max_lat, popup_fields) VALUES
    ('zones', 'Zones', grp('administrative-boundaries'), 'vector', 'outline', '#E4572E', 'vector-data/Zones.geojson', 13, 71.728476, 21.451971, 71.821823, 21.512008,
        '{ZName,GridNum,Name,Area_SqM}')
ON CONFLICT (key) DO NOTHING;
