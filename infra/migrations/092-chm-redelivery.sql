-- CHM re-delivered at 23537x15234 px (no white padding -- its own alpha is
-- already cut to the footprint, content fills the canvas on all four
-- edges). That's too wide for a single MapLibre image-source texture, so
-- it's now tiled the same way as Orthomosaic/DSM/DTM/Aspect
-- (tools/prepare-raster-tiles.sh) and carries DSM's current bounds outright:
-- the new content's pixel aspect (1.5450) matches DSM's current bounds
-- (1.5546) far closer than the stale CHM bounds it carried before (1.6054),
-- confirming the file_path and bounds below.
--
-- apps/raster-data/CHM.pmtiles itself is not committed (matches
-- Orthomosaic/DSM/DTM/Aspect -- too big for Git LFS, copied to the server
-- with scp) -- deploy it there by hand after running this.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/092-chm-redelivery.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET
    file_path = 'raster-data/CHM.pmtiles',
    min_lon = 71.7258930, min_lat = 21.4500615, max_lon = 71.8231094, max_lat = 21.5125858
WHERE key = 'chm';
