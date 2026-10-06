-- Polygon styling: every polygon layer draws as a transparent fill inside its
-- outline, keeping the outline's own style (solid/dotted/dashed) and colour,
-- except Cadastral, Village, Forest Boundary and Grazing Land, which stay
-- lines only. Watershed's outline is solid (no animated flow gaps).
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/057-polygon-fills.sql
--
-- Idempotent: plain UPDATEs.

BEGIN;
UPDATE static_overlays SET kind = 'fill'
WHERE asset_type = 'vector' AND kind = 'outline'
  AND key NOT IN ('cadastralMap', 'villages', 'forestBoundary', 'grazingLand');
UPDATE static_overlays SET kind = 'fill', solid = true WHERE key = 'watershed';
COMMIT;
