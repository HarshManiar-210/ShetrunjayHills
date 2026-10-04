-- Tree Statistics grid: a solid outline whose popup shows the cell's totals.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/047-tree-grid-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET solid = true, popup_fields = '{"GridNum:Grid Number",Zone,"Total_Tree_Count:Total tree Count","Total_Tree_Species:Total Species","Total_Carbon_Tonnes:Total Carbon/Tonnes","Carbon_Density_t_ha:Carbon Density Tonnes/Ha"}' WHERE key = 'treeGrid';
