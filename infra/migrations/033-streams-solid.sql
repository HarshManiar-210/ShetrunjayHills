-- Stream Network: draw as solid lines, without the animated "marching ants"
-- flow gaps (static_overlays.solid, see infra/postgis-init/init.sql).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/033-streams-solid.sql
--
-- Idempotent: a plain UPDATE by key.

BEGIN;
UPDATE static_overlays SET solid = true WHERE key = 'streams';
COMMIT;
