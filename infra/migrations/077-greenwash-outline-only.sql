-- Greenwash Area: border only, no fill. 057-polygon-fills.sql's blanket
-- outline-to-fill conversion swept this layer up along with everything else;
-- this carves out the one explicit exception for it, after 057 in migration
-- order so a full replay from 001 doesn't revert it again.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/077-greenwash-outline-only.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET kind = 'outline' WHERE key = 'greenwash';
