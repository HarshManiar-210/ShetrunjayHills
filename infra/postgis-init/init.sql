-- Shetrunjay Hills — Web GIS Dashboard
-- PostGIS schema + database-driven RBAC + mock data.
-- Runs automatically on first container start via docker-entrypoint-initdb.d.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles (id) ON DELETE RESTRICT
);

-- Mixed geometry types (Polygon, LineString) live in one column, so the
-- column type stays generic; each layer's actual type is whatever was
-- inserted (validated with ST_GeometryType downstream if ever needed).
CREATE TABLE layers (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL UNIQUE,
    geometry GEOMETRY(Geometry, 4326) NOT NULL
);

CREATE INDEX layers_geometry_idx ON layers USING GIST (geometry);

CREATE TABLE role_layer_permissions (
    role_id  INTEGER NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    layer_id INTEGER NOT NULL REFERENCES layers (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, layer_id)
);

-- ---------------------------------------------------------------------------
-- Seed: roles
-- ---------------------------------------------------------------------------

INSERT INTO roles (name) VALUES
    ('regular_user'),
    ('admin'),
    ('support_team');

-- ---------------------------------------------------------------------------
-- Seed: users (one mock account per role)
-- password for all three mock users is: password123
-- (bcrypt hashes below, cost factor 10 — verify with golang.org/x/crypto/bcrypt)
-- ---------------------------------------------------------------------------

INSERT INTO users (username, password_hash, role_id) VALUES
    ('regular_user', '$2b$10$8bt7OLcdto4aL/acSufj1.aQNguwzrKyCFpLGYWQPy.1fFyLpFjdW', (SELECT id FROM roles WHERE name = 'regular_user')),
    ('admin_user',   '$2b$10$lWZ3JeJgUw3DzdvnVrpMBu3YVLvUPAFsz4vi1IZh4OePqBOlHj7le', (SELECT id FROM roles WHERE name = 'admin')),
    ('support_user', '$2b$10$6M2JLxqpCoDqqcwvA0Ubd.nEOAvxYm4zUfBJ5Jabiuptc3b4doREq', (SELECT id FROM roles WHERE name = 'support_team'));

-- ---------------------------------------------------------------------------
-- Seed: layers
-- city_border/roads/metro_train are mock geometry (shape only, not surveyed),
-- centered on the real Shetrunjay Hill Range near Palitana, Bhavnagar
-- district, Gujarat (~21.4719N, 71.7800E) rather than the earlier Ahmedabad
-- placeholder. shetrunjay_hills_range is real: a single geocoded point at
-- that location.
-- ---------------------------------------------------------------------------

INSERT INTO layers (name, geometry) VALUES
    (
        'city_border',
        ST_GeomFromGeoJSON('{
            "type": "Polygon",
            "coordinates": [[
                [71.7086, 21.5494],
                [71.8586, 21.5494],
                [71.8586, 21.3994],
                [71.7086, 21.3994],
                [71.7086, 21.5494]
            ]]
        }')
    ),
    (
        'roads',
        ST_GeomFromGeoJSON('{
            "type": "LineString",
            "coordinates": [
                [71.7146, 21.4794],
                [71.7236, 21.4644],
                [71.7336, 21.4494],
                [71.7386, 21.4344]
            ]
        }')
    ),
    (
        'metro_train',
        ST_GeomFromGeoJSON('{
            "type": "LineString",
            "coordinates": [
                [71.8052, 21.5634],
                [71.7936, 21.5194],
                [71.7883, 21.4889],
                [71.7799, 21.4719],
                [71.7766, 21.4394]
            ]
        }')
    ),
    (
        'shetrunjay_hills_range',
        ST_GeomFromGeoJSON('{
            "type": "Point",
            "coordinates": [71.7800412, 21.4718707]
        }')
    );

-- ---------------------------------------------------------------------------
-- Seed: permissions
-- regular_user -> city_border, roads, shetrunjay_hills_range
-- admin, support_team -> all four
-- ---------------------------------------------------------------------------

INSERT INTO role_layer_permissions (role_id, layer_id)
SELECT r.id, l.id
FROM roles r
CROSS JOIN layers l
WHERE
    (r.name = 'regular_user' AND l.name IN ('city_border', 'roads', 'shetrunjay_hills_range'))
    OR (r.name IN ('admin', 'support_team'));
