-- Moves the Tree Grid layer out of Tree Statistics and into Admin
-- Boundaries, where the rest of the grid/zone/boundary reference layers
-- live. Also fixes a caption typo and brackets the two units. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/059-move-tree-grid-to-admin-boundaries.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET
    label = 'Tree Grid',
    group_id = grp('administrative-boundaries'),
    sort_order = 14,
    popup_fields = '{"GridNum:Grid Number",Zone,"Total_Tree_Count:Total Tree Count","Total_Tree_Species:Total Species","Total_Carbon_Tonnes:Total Carbon (Tonnes)","Carbon_Density_t_ha:Carbon Density (Tonnes/Ha)"}'
WHERE key = 'treeGrid';
