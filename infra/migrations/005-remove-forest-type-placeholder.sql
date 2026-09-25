-- Drops the "Forest Type" (Yearwise) placeholder: a 'pending' raster row with
-- no data ever delivered, superseded by the delivered Forest Type FSI 2023
-- vector layer (forestTypeFSI, see 002-forest-fsi-2023.sql).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the DELETEs below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/005-remove-forest-type-placeholder.sql
--
-- Idempotent: every statement matches nothing once run, including against a
-- fresh database seeded from the already-updated init.sql.
--
-- Overlay is deleted before the group (static_overlays.group_id is
-- ON DELETE RESTRICT, not CASCADE) — the group would otherwise refuse to go.

BEGIN;

DELETE FROM static_overlays WHERE key = 'forestType';
DELETE FROM layer_groups WHERE key = 'forest-type';

COMMIT;

-- What this reads afterwards, for checking by eye:
--   SELECT key FROM layer_groups WHERE key = 'forest-type'; -- 0 rows
--   SELECT key FROM static_overlays WHERE key = 'forestType'; -- 0 rows
