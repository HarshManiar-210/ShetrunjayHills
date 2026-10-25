-- The site's real login: one admin account, username holding an email
-- address (see init.sql's Seed: the site login). Restates init.sql; apply
-- to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/074-site-login.sql
--
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO users (username, password_hash, role_id) VALUES
    ('example@gmail.com', '$2a$10$qL8c848SRHwmRP0GeNtjOeUSX9Jzo34u.SdlbOkYtENo1rSlWufuG', (SELECT id FROM roles WHERE name = 'admin'))
ON CONFLICT (username) DO NOTHING;
