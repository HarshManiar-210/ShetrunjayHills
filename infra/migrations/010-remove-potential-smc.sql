-- Drops Potential SMC: its 69 features are exactly Proposed Conservation
-- Sites' Matipala, Vantalavadi and Checkdam combined (delivered separately in
-- 009), and drawn on top of them it swallowed their clicks.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statement below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/010-remove-potential-smc.sql
--
-- Idempotent: matches nothing once run.

DELETE FROM static_overlays WHERE key = 'potentialSmc';
