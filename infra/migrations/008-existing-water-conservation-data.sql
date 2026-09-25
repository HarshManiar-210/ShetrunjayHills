-- Delivers Existing Water Conservation's remaining data: Matipala (was
-- 'pending', no file) and repoints Causeway/Checkdam/Vantalavadi at their
-- renamed files. Files gained an "-existing-water-conservation" suffix so
-- they stay distinct from Proposed Conservation Sites' own
-- Matipala/Vantalavadi/Checkdam once those are delivered too.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/008-existing-water-conservation-data.sql
--
-- Idempotent: plain UPDATEs by key, safe to run any number of times.

BEGIN;

UPDATE static_overlays
SET file_path = 'vector-data/causeway-existing-water-conservation.geojson'
WHERE key = 'causeway';

UPDATE static_overlays
SET file_path = 'vector-data/check-dam-existing-water-conservation.geojson'
WHERE key = 'checkDam';

UPDATE static_overlays
SET file_path = 'vector-data/vantalawadi-existing-water-conservation.geojson'
WHERE key = 'vantalawadi';

UPDATE static_overlays
SET
    kind = 'fill',
    color = '#4E8D5E',
    file_path = 'vector-data/maitpaala-existing-water-conservation.geojson',
    status = 'available',
    min_lon = 71.731340,
    min_lat = 21.456625,
    max_lon = 71.818964,
    max_lat = 21.505978
WHERE key = 'matiPala';

-- Options order in the side panel: Matipala, Vantalavadi, Checkdam, Causeway
-- (Proposed follows the same order, with Potential SMC last).
UPDATE static_overlays SET sort_order = 1 WHERE key = 'matiPala';
UPDATE static_overlays SET sort_order = 2 WHERE key = 'vantalawadi';
UPDATE static_overlays SET sort_order = 3 WHERE key = 'checkDam';
UPDATE static_overlays SET sort_order = 4 WHERE key = 'causeway';
UPDATE static_overlays SET sort_order = 5 WHERE key = 'potentialSmc';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key, status, file_path FROM static_overlays
--    WHERE key IN ('causeway', 'checkDam', 'vantalawadi', 'matiPala');
--   -- all four 'available', file_path ending "-existing-water-conservation.geojson"
