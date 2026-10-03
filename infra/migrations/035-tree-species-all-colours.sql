-- Tree Statistics legend: every species gets its own colour instead of the
-- top ten plus "Other species". Restates infra/postgis-init/init.sql; apply to
-- an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/035-tree-species-all-colours.sql
--
-- Idempotent: a plain UPDATE by key. Unnamed trees fall through to `color`.

UPDATE static_overlays SET color_field = 'Predicted_SN',
    categories = '[
        {"value": "Butea monosperma", "label": "Butea monosperma", "color": "#f28e2b"},
        {"value": "Senegalia senegal", "label": "Senegalia senegal", "color": "#4e79a7"},
        {"value": "Dichrostachys cinerea", "label": "Dichrostachys cinerea", "color": "#e15759"},
        {"value": "Acacia nilotica", "label": "Acacia nilotica", "color": "#76b7b2"},
        {"value": "Ficus benjamina L.", "label": "Ficus benjamina", "color": "#59a14f"},
        {"value": "Anogeissus latifolia", "label": "Anogeissus latifolia", "color": "#edc948"},
        {"value": "Azadirachta indica", "label": "Azadirachta indica", "color": "#b07aa1"},
        {"value": "Prosopis juliflora", "label": "Prosopis juliflora", "color": "#ff9da7"},
        {"value": "Boswellia serrata", "label": "Boswellia serrata", "color": "#9c755f"},
        {"value": "Mangifera indica", "label": "Mangifera indica", "color": "#17becf"},
        {"value": "Vachellia nilotica", "label": "Vachellia nilotica", "color": "#1f77b4"},
        {"value": "Tamarindus indica L", "label": "Tamarindus indica L", "color": "#d62728"},
        {"value": "Senna cericulata", "label": "Senna cericulata", "color": "#2ca02c"},
        {"value": "Pongamia pinnata", "label": "Pongamia pinnata", "color": "#9467bd"},
        {"value": "Neltuma juliflora", "label": "Neltuma juliflora", "color": "#8c564b"},
        {"value": "Manilkara hexandra", "label": "Manilkara hexandra", "color": "#e377c2"},
        {"value": "Leucaena leucocephala", "label": "Leucaena leucocephala", "color": "#7f7f7f"},
        {"value": "Lannea coromandelica (Houtt.) Merr.", "label": "Lannea coromandelica (Houtt.) Merr.", "color": "#bcbd22"},
        {"value": "Fugeea Sp", "label": "Fugeea Sp", "color": "#aec7e8"},
        {"value": "Ficus religiosa", "label": "Ficus religiosa", "color": "#ffbb78"},
        {"value": "Ficus benghalensis", "label": "Ficus benghalensis", "color": "#98df8a"},
        {"value": "Ficus bengalensis", "label": "Ficus bengalensis", "color": "#ff9896"},
        {"value": "Euphorbia", "label": "Euphorbia", "color": "#c5b0d5"},
        {"value": "Diospyros melanoxylon Roxb.", "label": "Diospyros melanoxylon Roxb.", "color": "#c49c94"},
        {"value": "Diospyros melanoxylon", "label": "Diospyros melanoxylon", "color": "#f7b6d2"},
        {"value": "Delonix regia", "label": "Delonix regia", "color": "#dbdb8d"},
        {"value": "Cassia fistula", "label": "Cassia fistula", "color": "#9edae5"},
        {"value": "Butea monosperma var. lutea", "label": "Butea monosperma var. lutea", "color": "#393b79"},
        {"value": "Bambusa vulgaris", "label": "Bambusa vulgaris", "color": "#637939"},
        {"value": "Balanites roxburghii", "label": "Balanites roxburghii", "color": "#8c6d31"},
        {"value": "Bahunia", "label": "Bahunia", "color": "#843c39"},
        {"value": "Albizia amara", "label": "Albizia amara", "color": "#7b4173"},
        {"value": "Albizia Sp", "label": "Albizia Sp", "color": "#3182bd"},
        {"value": "Ailanthus excelsa", "label": "Ailanthus excelsa", "color": "#e6550d"},
        {"value": "Unidentified", "label": "Unidentified", "color": "#bab0ac"}
    ]'::jsonb
WHERE key = 'treeStatistics';
