-- Hide Growing Stock statistics: the client asked for the Statistics panel
-- (and the map export) not to show Growing Stock. A new static_overlays
-- column, show_stats, says which layers are listed; the layer itself and its
-- legend are unaffected. Restates init.sql; apply to an existing database
-- with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/095-hide-growing-stock-stats.sql
--
-- Idempotent: ADD COLUMN IF NOT EXISTS and a plain UPDATE by key.

ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS show_stats BOOLEAN NOT NULL DEFAULT true;

UPDATE static_overlays SET show_stats = false WHERE key = 'growingStock';
