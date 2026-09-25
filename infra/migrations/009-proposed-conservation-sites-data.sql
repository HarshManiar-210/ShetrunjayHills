-- Delivers Proposed Conservation Sites' Matipala, Vantalavadi and Checkdam
-- (were 'pending'), and adds static_overlays.popup_fields so a layer can name
-- the attributes its popup shows -- Zone_2 for these three.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/009-proposed-conservation-sites-data.sql
--
-- Idempotent: ADD COLUMN IF NOT EXISTS and plain UPDATEs by key.

BEGIN;

ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS popup_fields TEXT[];

UPDATE static_overlays SET kind = 'fill', color = '#A3C45A', status = 'available', popup_fields = '{Zone_2}',
    file_path = 'vector-data/matipala-proposed-conservation-sites.geojson', sort_order = 1,
    min_lon = 71.730361, min_lat = 21.458872, max_lon = 71.820895, max_lat = 21.489651
WHERE key = 'proposedMatipala';

UPDATE static_overlays SET kind = 'fill', color = '#C77DBA', status = 'available', popup_fields = '{Zone_2}',
    file_path = 'vector-data/vantalavdi-proposed-conservation-sites.geojson', sort_order = 2,
    min_lon = 71.736501, min_lat = 21.465143, max_lon = 71.814602, max_lat = 21.501276
WHERE key = 'proposedVantalavadi';

UPDATE static_overlays SET kind = 'fill', color = '#E0A030', status = 'available', popup_fields = '{Zone_2}',
    file_path = 'vector-data/checkdam-proposed-conservation-sites.geojson', sort_order = 3,
    min_lon = 71.759037, min_lat = 21.458173, max_lon = 71.814519, max_lat = 21.502023
WHERE key = 'proposedCheckdam';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key, status, popup_fields FROM static_overlays
--    WHERE key LIKE 'proposed%';  -- three 'available', {Zone_2}
