-- Drops the Biodiversity Data section: it held only two 'pending' placeholder
-- rows (Field Plots and Statistics, Rare Species), no data ever delivered.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the DELETEs below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/003-remove-biodiversity-data.sql
--
-- Idempotent: every statement matches nothing once run, including against a
-- fresh database seeded from the already-updated init.sql.
--
-- Overlays are deleted before the group (static_overlays.group_id is
-- ON DELETE RESTRICT, not CASCADE) — the group would otherwise refuse to go.

BEGIN;

DELETE FROM static_overlays WHERE key IN ('fieldPlots', 'rareSpecies');
DELETE FROM layer_groups WHERE key = 'biodiversity-data';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key FROM layer_groups WHERE key = 'biodiversity-data'; -- 0 rows
--   SELECT key FROM static_overlays WHERE key IN ('fieldPlots', 'rareSpecies'); -- 0 rows
