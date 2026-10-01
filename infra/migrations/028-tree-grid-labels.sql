-- Tree Statistics grid: show each cell's number on the map. Adds the
-- static_overlays.label_field column that expresses that as data (see its
-- comment in infra/postgis-init/init.sql), then sets it on the treeGrid row.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/028-tree-grid-labels.sql
--
-- Idempotent: an IF NOT EXISTS column and a plain UPDATE by key.

BEGIN;
ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS label_field TEXT;
UPDATE static_overlays SET label_field = 'GridNum' WHERE key = 'treeGrid';
COMMIT;
