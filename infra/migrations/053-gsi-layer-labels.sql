-- Geology and Geomorphology come from GSI; say so in the legend title.
UPDATE static_overlays SET label = 'Geology (GSI layer)' WHERE key = 'geology';
UPDATE static_overlays SET label = 'Geomorphology (GSI layer)' WHERE key = 'geomorphology';
