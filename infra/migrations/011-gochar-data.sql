-- Delivers Grazing Land (Gochar): six village gochar polygons (was 'pending').
-- Exported from KML, so the popup is limited to each feature's Name.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/011-gochar-data.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET kind = 'fill', color = '#C2A35A', status = 'available', popup_fields = '{Name}',
    file_path = 'vector-data/gochar.geojson',
    min_lon = 71.757347, min_lat = 21.458765, max_lon = 71.820685, max_lat = 21.489645
WHERE key = 'grazingLand';
