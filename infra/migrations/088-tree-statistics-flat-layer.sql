-- Client ask: remove the "Tree Statistics" grouping -- show Trees as a
-- normal point layer, no nested "Trees" row underneath a "Tree Statistics"
-- parent. tree-statistics was a one-item nested group (see lib/sections.ts,
-- mode "options"), which always renders as a parent row plus a single child
-- checkbox even with nothing else in it. Reassigns the Trees overlay
-- directly onto Drone Analysis -- same shape TOF already has -- and drops
-- the now-empty tree-statistics group.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/088-tree-statistics-flat-layer.sql
--
-- Idempotent: the UPDATE matches nothing once the row has moved, and the
-- DELETE matches nothing once the group is gone.

BEGIN;

UPDATE static_overlays SET group_id = (SELECT id FROM layer_groups WHERE key = 'drone-analysis'), sort_order = 3
WHERE key = 'treeStatistics';

DELETE FROM layer_groups WHERE key = 'tree-statistics';

COMMIT;
