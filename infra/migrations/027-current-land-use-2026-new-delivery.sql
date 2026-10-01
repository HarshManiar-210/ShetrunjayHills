-- Current Land Use (Drone: 2026): the client's new delivery of the 2026 LULC
-- image (raster-data/originals/lulc/2026.png). It is the image the official
-- class statistics already seeded for lulc_2026 were computed from -- its
-- class shares match them to 0.01% -- so only its placement changes. Refitted
-- to the study-area outline and resampled from UTM 42N by
-- tools/prepare-study-area-rasters.py (IoU 0.9989, 0.84 m pixels).
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/027-current-land-use-2026-new-delivery.sql
--
-- Idempotent: a plain UPDATE by file path.

BEGIN;
UPDATE static_overlays SET min_lon=71.7277442, min_lat=21.4511012, max_lon=71.8227026, max_lat=21.5133776 WHERE file_path='raster-data/lulc/2026.png';
COMMIT;
