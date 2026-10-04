-- Tree Statistics (trees): popup shows Tree Id, Species, Max Height, Carbon and
-- Grid Number (True_Heigh is dropped). Restates init.sql; apply to an existing
-- database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/045-tree-statistics-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{"Tree_ID:Tree Id","Predicted_SN:Species","Max_Height:Max Height","Carbon_kg:Carbon","GridNum:Grid Number"}' WHERE key = 'treeStatistics';
