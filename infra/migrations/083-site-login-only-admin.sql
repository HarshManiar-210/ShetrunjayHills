-- Site login: admin@shantrunjayforest.org becomes the only account. It
-- replaces example@gmail.com and the three mock role accounts
-- (regular_user, admin_user, support_user); the roles themselves stay, so
-- permissions are still rows. Restates init.sql; apply to an existing
-- database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/083-site-login-only-admin.sql
--
-- then set its password (no password or hash is kept in the repo):
--
--   tools/set-user-password.sh admin@shantrunjayforest.org
--
-- A new account gets the placeholder hash '!', which bcrypt never matches,
-- so it cannot sign in until that script has run. Idempotent: a re-run
-- leaves an already-set password alone (only role_id is refreshed), and the
-- DELETE matches nothing once run. Existing tokens for removed accounts stay
-- valid until they expire, since JWTs are not checked against the table.

BEGIN;

INSERT INTO users (username, password_hash, role_id) VALUES
    ('admin@shantrunjayforest.org', '!', (SELECT id FROM roles WHERE name = 'admin'))
ON CONFLICT (username) DO UPDATE SET role_id = EXCLUDED.role_id;

DELETE FROM users WHERE username <> 'admin@shantrunjayforest.org';

COMMIT;
