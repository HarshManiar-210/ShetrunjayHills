-- Drone rasters: the client's full-resolution (~24,000 px) delivery, served
-- as lossless-WebP PMTiles archives built by tools/prepare-raster-tiles.sh.
-- CHM now shares DSM's footprint, so it takes DSM's bounds.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/024-drone-raster-tiles.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET file_path='raster-data/Orthomosaic.pmtiles' WHERE key='orthomosaic';
UPDATE static_overlays SET file_path='raster-data/DSM.pmtiles'    WHERE key='dsm';
UPDATE static_overlays SET file_path='raster-data/DTM.pmtiles'    WHERE key='dtm';
UPDATE static_overlays SET file_path='raster-data/Slope.pmtiles'  WHERE key='slope';
UPDATE static_overlays SET file_path='raster-data/Aspect.pmtiles' WHERE key='aspect';
UPDATE static_overlays SET file_path='raster-data/CHM.pmtiles',
    min_lon=71.7268383, min_lat=21.4503137, max_lon=71.8240547, max_lat=21.5128380 WHERE key='chm';
COMMIT;
