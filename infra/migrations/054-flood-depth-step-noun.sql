-- Flood Depth's images are depth levels (0.5/1/2/5/10 m), not years, so the
-- year bar should say "5 depths" and "Compare two depths". Adds
-- layer_groups.step_noun (see its comment in infra/postgis-init/init.sql),
-- 'year' for every group but Flood Depth.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/054-flood-depth-step-noun.sql
--
-- Idempotent: an IF NOT EXISTS column and a plain UPDATE by key.

BEGIN;
ALTER TABLE layer_groups ADD COLUMN IF NOT EXISTS step_noun TEXT NOT NULL DEFAULT 'year';
UPDATE layer_groups SET step_noun = 'depth' WHERE key = 'flood-depth';
COMMIT;
