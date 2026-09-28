-- Flood Depth: replace the delivered "Flood All Layers" extent, which put the
-- flooding ~4 km south of the hills, with bounds fitted to Streams.geojson
-- (see the Flood Depth comment in infra/postgis-init/init.sql).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/025-flood-depth-placement.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET min_lon=71.7283593, min_lat=21.4569948, max_lon=71.8255269, max_lat=21.5139052 WHERE key='flood0_5m';
UPDATE static_overlays SET min_lon=71.7266993, min_lat=21.4519680, max_lon=71.8221845, max_lat=21.5128352 WHERE key='flood1m';
UPDATE static_overlays SET min_lon=71.7276993, min_lat=21.4532273, max_lon=71.8215193, max_lat=21.5127352 WHERE key='flood2m';
UPDATE static_overlays SET min_lon=71.7276993, min_lat=21.4536271, max_lon=71.8214723, max_lat=21.5131052 WHERE key='flood5m';
UPDATE static_overlays SET min_lon=71.7281293, min_lat=21.4537554, max_lon=71.8219049, max_lat=21.5132352 WHERE key='flood10m';
COMMIT;
