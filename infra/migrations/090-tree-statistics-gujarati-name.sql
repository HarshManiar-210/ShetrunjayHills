-- Trees popup gains a Gujarati Name row. GujaratiName is a new per-feature
-- property added to vector-data/tree-statistics.pmtiles itself (joined from
-- Predicted_SN against the species table already used for the legend, see
-- init.sql's treeStatistics `categories`); this migration only updates the
-- popup_fields row, the data file ships separately.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/090-tree-statistics-gujarati-name.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields =
    '{"Tree_ID:Tree Id","Predicted_SN:Species","GujaratiName:Gujarati Name","Max_Height:Max Height","Carbon_kg:Carbon","GridNum:Grid Number"}'
WHERE key = 'treeStatistics';
