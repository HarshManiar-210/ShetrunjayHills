-- Stream Network: the popup's Length shows its unit, metres, after the value
-- (a `Field::unit` popup entry; see apps/web/lib/feature-popup.ts).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/066-stream-length-unit.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{strmOrder,"Length::m"}' WHERE key = 'streams';
