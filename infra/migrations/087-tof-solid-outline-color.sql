-- Client ask: TOF (Trees Outside Forests) line will be solid, fill as it is.
-- "Solid" means each class's own colour, continuous and unbroken -- not a
-- fixed black border. A black outline_color was tried here first; the
-- client corrected that reading, so this clears outline_color back to unset
-- (NULL), letting Map.tsx's `outlineColor ?? fillColor` fallback colour
-- each class's edge the same as its own fill -- which is what
-- 079-tof-solid-symbology.sql's solid = true already gave every class: a
-- continuous, non-animated line in its own colour.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/087-tof-solid-outline-color.sql
--
-- Idempotent: plain UPDATE by key.

UPDATE static_overlays SET outline_color = NULL WHERE key = 'treesOutsideForests';
