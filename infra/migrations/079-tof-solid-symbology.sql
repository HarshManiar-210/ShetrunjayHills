-- TOF (Trees Outside Forests): solid fill and solid outline for every class
-- (Block / Built-up / Linear / Scattered), per the client's symbology table.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/079-tof-solid-symbology.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET fill_opacity = 1, solid = true WHERE key = 'treesOutsideForests';
