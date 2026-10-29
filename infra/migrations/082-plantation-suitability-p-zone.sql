-- Plantation Suitability Zones: the updated delivery adds a `P_Zone` class
-- name to every point (one-to-one with the numeric `Pkantation` code). The
-- layer is now classed and its popup labelled by it, and its points draw
-- larger via a new static_overlays.point_radius column (NULL keeps the
-- frontend's default for every other point layer). The GeoJSON itself is
-- replaced at apps/vector-data/plantation-suitabilty-zones.geojson.
-- Restates infra/postgis-init/init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/082-plantation-suitability-p-zone.sql
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, then a plain UPDATE by key.

BEGIN;

ALTER TABLE static_overlays
    ADD COLUMN IF NOT EXISTS point_radius DOUBLE PRECISION CHECK (point_radius > 0);

UPDATE static_overlays SET color_field = 'P_Zone',
    categories = '[
        {"value": "Water/Rocks/Builtup", "label": "Water/Rocks/Builtup", "color": "#ff0000"},
        {"value": "Herbs/Shrubs/Grass", "label": "Herbs/Shrubs/Grass", "color": "#ffff00"},
        {"value": "Trees/Dense Vegetation", "label": "Trees/Dense Vegetation", "color": "#3b862c"},
        {"value": "Plantation", "label": "Plantation", "color": "#875400"}
    ]'::jsonb,
    popup_fields = '{"Zone","P_Zone:Plantation Zone","ZoneName:Zone Name"}',
    point_radius = 5
WHERE key = 'plantationSuitabilityZones';

COMMIT;
