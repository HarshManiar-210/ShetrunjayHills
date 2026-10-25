-- Orthomosaic was displaced ~98m east and ~28m north of the basemap. The
-- source PNG no longer exists, so the archive itself was rebuilt by pulling
-- every zoom-19 tile back out of the mispositioned one, re-stamping the
-- geotransform with the measured correction (a pure coordinate relabel, no
-- resampling), and re-tiling zoom 10-19 from that. This row's bounds are
-- cosmetic for a tiled raster (the archive's own tile grid is what actually
-- places it — see static_overlays' comment on this block), but restated
-- here to keep "fit to layer" accurate. Restates init.sql; apply to an
-- existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/075-orthomosaic-alignment.sql
--
-- The corrected Orthomosaic.pmtiles itself still needs to be copied onto the
-- server the same way the original was — this migration only restates the
-- bounds row.
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon = 71.7255921, min_lat = 21.4501217, max_lon = 71.8234103, max_lat = 21.5125858 WHERE key = 'orthomosaic';
