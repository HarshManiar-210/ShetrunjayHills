-- Forest Fragmentation: name the three Core classes by hectares, as the
-- client's legend table does -- Core (<101 Hectares), Core (101-202
-- Hectares), Core (>202 Hectares), formerly <250 / 250-500 / >500 acres.
-- The legend and Statistics panel take their names from legend-config.ts;
-- these are the delivered-label fallbacks in the seeded statistics.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/068-fragmentation-core-hectares.sql
--
-- Idempotent: plain UPDATEs by class value.

BEGIN;
UPDATE overlay_class_stats SET label = 'Core (<101 Hectares)'    WHERE class_value = 'core-small';
UPDATE overlay_class_stats SET label = 'Core (101-202 Hectares)' WHERE class_value = 'core-medium';
UPDATE overlay_class_stats SET label = 'Core (>202 Hectares)'    WHERE class_value = 'core-large';
COMMIT;
