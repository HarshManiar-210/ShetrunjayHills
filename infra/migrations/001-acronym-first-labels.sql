-- Acronym-first labels for the layers that have one.
--
-- "CHM (Canopy Height Model)" rather than "Canopy Height Model (CHM)": the
-- short form is what people say, and it is what survives a narrow row in the
-- layers panel or the year bar's theme selector, with the expansion there for
-- anyone who needs it.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists keeps its old labels until something like this
-- is run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/001-acronym-first-labels.sql
--
-- Idempotent, and safe to run against a fresh database too, where every
-- statement simply matches nothing.
--
-- Deliberately not touched:
--   'Potential SMC'         -- no expansion was supplied for SMC
--   'Grazing Land (Gochar)' -- Gochar is the local name, not an acronym
--   '... (Yearwise)', 'Flood Depth (m)', '... (Satellite: 1978-2025)'
--                           -- qualifiers and units, not acronyms

BEGIN;

UPDATE layer_groups SET label = 'DSM (Digital Surface Model)'
 WHERE key = 'dsm' AND label = 'Digital Surface Model (DSM)';

UPDATE layer_groups SET label = 'DTM (Digital Terrain Model)'
 WHERE key = 'dtm' AND label = 'Digital Terrain Model (DTM)';

UPDATE layer_groups SET label = 'CHM (Canopy Height Model)'
 WHERE key = 'chm' AND label = 'Canopy Height Model (CHM)';

UPDATE static_overlays SET label = 'DSM (Digital Surface Model)'
 WHERE key = 'dsm' AND label = 'Digital Surface Model (DSM)';

UPDATE static_overlays SET label = 'DTM (Digital Terrain Model)'
 WHERE key = 'dtm' AND label = 'Digital Terrain Model (DTM)';

UPDATE static_overlays SET label = 'CHM (Canopy Height Model)'
 WHERE key = 'chm' AND label = 'Canopy Height Model (CHM)';

UPDATE static_overlays SET label = 'TOF (Trees Outside Forests)'
 WHERE key = 'treesOutsideForests' AND label = 'Trees Outside Forests (TOF)';

COMMIT;

-- What the four rows read afterwards, for checking by eye:
--   SELECT key, label FROM layer_groups    WHERE key IN ('dsm','dtm','chm');
--   SELECT key, label FROM static_overlays WHERE key IN ('dsm','dtm','chm','treesOutsideForests');
