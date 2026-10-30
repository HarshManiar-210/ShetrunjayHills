-- The site login's address is admin@shatrunjayforest.org (no 'n' after
-- "sha"), correcting the seed's admin@shantrunjayforest.org. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/091-admin-username-correction.sql
--
-- Idempotent: a plain UPDATE by key. The password hash carries over
-- unchanged -- run tools/set-user-password.sh again only if the password
-- itself is also changing.

UPDATE users SET username = 'admin@shatrunjayforest.org'
WHERE username = 'admin@shantrunjayforest.org';
