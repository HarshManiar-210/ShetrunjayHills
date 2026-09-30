-- Study Area boundary: draw it bold and in one continuous colour. Adds the
-- static_overlays.line_width and .solid columns that express that as data
-- (see their comments in infra/postgis-init/init.sql), then sets them on the
-- studyArea row.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/026-study-area-bold-outline.sql
--
-- Idempotent: IF NOT EXISTS columns and a plain UPDATE by key.

BEGIN;
ALTER TABLE static_overlays
    ADD COLUMN IF NOT EXISTS line_width DOUBLE PRECISION CHECK (line_width > 0),
    ADD COLUMN IF NOT EXISTS solid BOOLEAN NOT NULL DEFAULT false;
UPDATE static_overlays SET line_width = 3, solid = true WHERE key = 'studyArea';
COMMIT;
