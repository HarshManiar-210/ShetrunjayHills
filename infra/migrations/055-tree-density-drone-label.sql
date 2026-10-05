-- Tree Density is drone-derived; say so in the legend title (and so in the
-- Layers dropdown and panel, which use the same label). The group label is
-- what the legend shows for a raster theme; the image row carries the same
-- text so the legend does not append it as a second label.
UPDATE layer_groups SET label = 'Tree Density (Drone)' WHERE key = 'tree-density';
UPDATE static_overlays SET label = 'Tree Density (Drone)' WHERE key = 'treeDensity';
