-- Forest Cover and LULC: the client's new per-year delivery (new colour
-- palettes, higher resolution). Each image is refitted to the study-area
-- outline and resampled from UTM 42N by tools/prepare-study-area-rasters.py;
-- these are the resulting bounds.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/023-lulc-forest-cover-new-delivery.sql
--
-- Idempotent: plain UPDATEs by file path.

BEGIN;
UPDATE static_overlays SET min_lon=71.7286467, min_lat=21.4515393, max_lon=71.8219906, max_lat=21.5129191 WHERE file_path='raster-data/forest-cover/1980.png';
UPDATE static_overlays SET min_lon=71.7280341, min_lat=21.4511189, max_lon=71.8225410, max_lat=21.5131123 WHERE file_path='raster-data/forest-cover/1989.png';
UPDATE static_overlays SET min_lon=71.7280378, min_lat=21.4510414, max_lon=71.8225355, max_lat=21.5131010 WHERE file_path='raster-data/forest-cover/1998.png';
UPDATE static_overlays SET min_lon=71.7280437, min_lat=21.4511625, max_lon=71.8225168, max_lat=21.5130726 WHERE file_path='raster-data/forest-cover/2008.png';
UPDATE static_overlays SET min_lon=71.7280397, min_lat=21.4512490, max_lon=71.8225252, max_lat=21.5131694 WHERE file_path='raster-data/forest-cover/2018.png';
UPDATE static_overlays SET min_lon=71.7280402, min_lat=21.4510100, max_lon=71.8225436, max_lat=21.5131225 WHERE file_path='raster-data/forest-cover/2025.png';
UPDATE static_overlays SET min_lon=71.7280448, min_lat=21.4513334, max_lon=71.8225226, max_lat=21.5130950 WHERE file_path='raster-data/forest-cover/2026.png';
UPDATE static_overlays SET min_lon=71.7282797, min_lat=21.4514148, max_lon=71.8223489, max_lat=21.5132224 WHERE file_path='raster-data/lulc/1980.png';
UPDATE static_overlays SET min_lon=71.7280354, min_lat=21.4511433, max_lon=71.8225295, max_lat=21.5130464 WHERE file_path='raster-data/lulc/1989.png';
UPDATE static_overlays SET min_lon=71.7280348, min_lat=21.4510837, max_lon=71.8225266, max_lat=21.5130027 WHERE file_path='raster-data/lulc/1998.png';
UPDATE static_overlays SET min_lon=71.7280348, min_lat=21.4510837, max_lon=71.8225266, max_lat=21.5130027 WHERE file_path='raster-data/lulc/2008.png';
UPDATE static_overlays SET min_lon=71.7280361, min_lat=21.4512032, max_lon=71.8225123, max_lat=21.5130427 WHERE file_path='raster-data/lulc/2018.png';
UPDATE static_overlays SET min_lon=71.7280248, min_lat=21.4513280, max_lon=71.8225252, max_lat=21.5129805 WHERE file_path='raster-data/lulc/2025.png';
UPDATE static_overlays SET min_lon=71.7280402, min_lat=21.4513279, max_lon=71.8225400, max_lat=21.5130106 WHERE file_path='raster-data/lulc/2026.png';
COMMIT;
