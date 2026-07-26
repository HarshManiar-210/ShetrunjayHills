package repository

import (
	"context"
	"fmt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// GetLayersByRoleID returns the layers a role is permitted to see, geometry
// serialized to GeoJSON by Postgres via ST_AsGeoJSON.
func (r *Repository) GetLayersByRoleID(ctx context.Context, roleID int) ([]models.Layer, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT layers.id, layers.name, ST_AsGeoJSON(layers.geometry)
		FROM layers
		JOIN role_layer_permissions ON role_layer_permissions.layer_id = layers.id
		WHERE role_layer_permissions.role_id = $1
		ORDER BY layers.id
	`, roleID)
	if err != nil {
		return nil, fmt.Errorf("repository: get layers by role id: %w", err)
	}
	defer rows.Close()

	layers := make([]models.Layer, 0)
	for rows.Next() {
		var l models.Layer
		if err := rows.Scan(&l.ID, &l.Name, &l.GeoJSON); err != nil {
			return nil, fmt.Errorf("repository: scan layer: %w", err)
		}
		layers = append(layers, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("repository: get layers by role id: %w", err)
	}

	return layers, nil
}
