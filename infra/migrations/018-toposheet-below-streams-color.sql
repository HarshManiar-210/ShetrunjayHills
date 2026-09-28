-- Two seed changes:
--   * layer_groups.draw_below: a raster group drawn beneath every other
--     raster. Set for the Toposheet, a full-sheet reference map that would
--     otherwise cover whatever imagery is switched on with it.
--   * Stream Network's colour, which is also its legend swatch: #1600ff.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/018-toposheet-below-streams-color.sql
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, and plain UPDATEs by key.

ALTER TABLE layer_groups ADD COLUMN IF NOT EXISTS draw_below BOOLEAN NOT NULL DEFAULT false;
UPDATE layer_groups SET draw_below = true WHERE key = 'toposheet';
UPDATE static_overlays SET color = '#1600ff' WHERE key = 'streams';
