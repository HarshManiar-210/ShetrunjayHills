package repository

import (
	"context"
	"fmt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// GetStaticOverlays returns every static overlay's metadata, ordered so items
// within a group stay together and in their seeded order. FilePath is populated but is
// json:"-" (see models.StaticOverlay) — the Overlays handler needs it to stat
// the asset for its size, and it never reaches the client.
func (r *Repository) GetStaticOverlays(ctx context.Context) ([]models.StaticOverlay, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, key, label, group_id, asset_type, COALESCE(kind, ''), COALESCE(color, ''),
			COALESCE(file_path, ''), min_lon, min_lat, max_lon, max_lat, status
		FROM static_overlays
		ORDER BY group_id, sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("repository: get static overlays: %w", err)
	}
	defer rows.Close()

	overlays := make([]models.StaticOverlay, 0)
	for rows.Next() {
		var o models.StaticOverlay
		if err := rows.Scan(
			&o.ID, &o.Key, &o.Label, &o.GroupID, &o.AssetType, &o.Kind, &o.Color,
			&o.FilePath, &o.MinLon, &o.MinLat, &o.MaxLon, &o.MaxLat, &o.Status,
		); err != nil {
			return nil, fmt.Errorf("repository: scan static overlay: %w", err)
		}
		overlays = append(overlays, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("repository: get static overlays: %w", err)
	}

	return overlays, nil
}

// GetStaticOverlayFilePath returns the on-disk path (relative to DATA_ROOT)
// for the overlay with the given key. Returns pgx.ErrNoRows (wrapped) when
// no such key exists.
func (r *Repository) GetStaticOverlayFilePath(ctx context.Context, key string) (string, error) {
	var path string
	err := r.pool.QueryRow(ctx, `SELECT file_path FROM static_overlays WHERE key = $1`, key).Scan(&path)
	if err != nil {
		return "", fmt.Errorf("repository: get static overlay file path: %w", err)
	}
	return path, nil
}

// GetLayerGroups returns the sidebar's tree as a flat list, parents before
// children (a parent always has a lower id, since the seed inserts top-level
// rows first) and siblings in their seeded order. The frontend assembles the
// nesting; keeping it flat here means one query and no recursive CTE.
func (r *Repository) GetLayerGroups(ctx context.Context) ([]models.LayerGroup, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, key, label, parent_id, sort_order
		FROM layer_groups
		ORDER BY COALESCE(parent_id, 0), sort_order, id
	`)
	if err != nil {
		return nil, fmt.Errorf("repository: get layer groups: %w", err)
	}
	defer rows.Close()

	groups := make([]models.LayerGroup, 0)
	for rows.Next() {
		var g models.LayerGroup
		if err := rows.Scan(&g.ID, &g.Key, &g.Label, &g.ParentID, &g.SortOrder); err != nil {
			return nil, fmt.Errorf("repository: scan layer group: %w", err)
		}
		groups = append(groups, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("repository: get layer groups: %w", err)
	}

	return groups, nil
}

// GetStaticOverlay returns one overlay row by key, including its FilePath and
// extent — what RasterStats needs to find the image and turn its pixels into
// ground area. Returns pgx.ErrNoRows (wrapped) when no such key exists.
func (r *Repository) GetStaticOverlay(ctx context.Context, key string) (models.StaticOverlay, error) {
	var o models.StaticOverlay
	err := r.pool.QueryRow(ctx, `
		SELECT id, key, label, group_id, asset_type, COALESCE(kind, ''), COALESCE(color, ''),
			COALESCE(file_path, ''), min_lon, min_lat, max_lon, max_lat, status
		FROM static_overlays
		WHERE key = $1
	`, key).Scan(
		&o.ID, &o.Key, &o.Label, &o.GroupID, &o.AssetType, &o.Kind, &o.Color,
		&o.FilePath, &o.MinLon, &o.MinLat, &o.MaxLon, &o.MaxLat, &o.Status,
	)
	if err != nil {
		return models.StaticOverlay{}, fmt.Errorf("repository: get static overlay: %w", err)
	}
	return o, nil
}
