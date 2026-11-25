-- Drone survey date: Orthomosaic, DSM and DTM come from the drone survey of
-- 12 June 2026, and their layer labels (legend, not the sidebar dropdown,
-- whose group labels stay plain) now say so. Restates init.sql; apply to an
-- existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/093-drone-survey-date.sql
--
-- Idempotent: plain UPDATEs by key.

UPDATE static_overlays SET label = 'Orthomosaic – Drone Survey: 12 June 2026' WHERE key = 'orthomosaic';
UPDATE static_overlays SET label = 'DSM (Digital Surface Model) – Drone Survey: 12 June 2026' WHERE key = 'dsm';
UPDATE static_overlays SET label = 'DTM (Digital Terrain Model) – Drone Survey: 12 June 2026' WHERE key = 'dtm';

-- An earlier draft of this file also dated the layer_groups labels; undo that
-- on a database it reached.
UPDATE layer_groups SET label = 'Orthomosaic' WHERE key = 'orthomosaic';
UPDATE layer_groups SET label = 'DSM (Digital Surface Model)' WHERE key = 'dsm';
UPDATE layer_groups SET label = 'DTM (Digital Terrain Model)' WHERE key = 'dtm';
