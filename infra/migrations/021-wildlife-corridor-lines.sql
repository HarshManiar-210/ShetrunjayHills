-- Wildlife Corridors' corridor lines: 7 lines from WildlifeCorridor.geojson,
-- drawn as a solid #f60b10 line. Seeded in the same group as the corridor
-- raster, so switching on Wildlife Corridors draws both.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/021-wildlife-corridor-lines.sql
--
-- Idempotent: ON CONFLICT DO NOTHING on the row's unique key.

INSERT INTO static_overlays (key, label, group_id, asset_type, kind, color, file_path, sort_order, min_lon, min_lat, max_lon, max_lat)
SELECT 'wildlifeCorridorLines', 'Wildlife Corridor', id, 'vector', 'line', '#f60b10', 'vector-data/WildlifeCorridor.geojson', 2, 71.752679, 21.461982, 71.820672, 21.507573
FROM layer_groups WHERE key = 'wildlife-corridors'
ON CONFLICT (key) DO NOTHING;
