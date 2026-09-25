-- Reorders Hydrogeology's three sub-groups: Flood Depth now sits right after
-- the flat items (Watershed is the last of those), ahead of Existing Water
-- Conservation and Proposed Conservation Sites.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/007-reorder-hydrogeology-groups.sql
--
-- Idempotent: plain UPDATEs by key, safe to run any number of times.

BEGIN;

UPDATE layer_groups SET sort_order = 1 WHERE key = 'flood-depth';
UPDATE layer_groups SET sort_order = 2 WHERE key = 'existing-water-conservation';
UPDATE layer_groups SET sort_order = 3 WHERE key = 'proposed-conservation-sites';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key, sort_order FROM layer_groups
--    WHERE key IN ('flood-depth', 'existing-water-conservation', 'proposed-conservation-sites')
--    ORDER BY sort_order;
--   -- flood-depth (1), existing-water-conservation (2), proposed-conservation-sites (3)
