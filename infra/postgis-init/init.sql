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
-- Seed: layers (mock geometries around Ahmedabad, EPSG:4326)
-- ---------------------------------------------------------------------------

INSERT INTO layers (name, geometry) VALUES
    (
        'city_border',
        ST_GeomFromGeoJSON('{
            "type": "Polygon",
            "coordinates": [[
                [72.50, 23.10],
                [72.65, 23.10],
                [72.65, 22.95],
                [72.50, 22.95],
                [72.50, 23.10]
            ]]
        }')
    ),
    (
        'roads',
        ST_GeomFromGeoJSON('{
            "type": "LineString",
            "coordinates": [
                [72.5060, 23.0300],
                [72.5150, 23.0150],
                [72.5250, 23.0000],
                [72.5300, 22.9850]
            ]
        }')
    ),
    (
        'metro_train',
        ST_GeomFromGeoJSON('{
            "type": "LineString",
            "coordinates": [
                [72.5966, 23.1140],
                [72.5850, 23.0700],
                [72.5797, 23.0395],
                [72.5713, 23.0225],
                [72.5680, 22.9900]
            ]
        }')
    );

-- ---------------------------------------------------------------------------
-- Seed: permissions
-- regular_user -> city_border, roads
-- admin, support_team -> all three
-- ---------------------------------------------------------------------------

INSERT INTO role_layer_permissions (role_id, layer_id)
SELECT r.id, l.id
FROM roles r
CROSS JOIN layers l
WHERE
    (r.name = 'regular_user' AND l.name IN ('city_border', 'roads'))
    OR (r.name IN ('admin', 'support_team'));
