-- Rivers: the popup shows only the Categories column, captioned "Type".
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/046-rivers-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{"Categories:Type"}' WHERE key = 'rivers';
