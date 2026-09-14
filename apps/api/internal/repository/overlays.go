package repository

import (
	"context"
	"fmt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// GetStaticOverlays returns every static overlay's metadata (never its
// FilePath — see models.StaticOverlay), ordered so items within a section
// stay grouped and stable.
func (r *Repository) GetStaticOverlays(ctx context.Context) ([]models.StaticOverlay, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, key, label, section, asset_type, COALESCE(kind, ''), COALESCE(color, ''),
			min_lon, min_lat, max_lon, max_lat, status
		FROM static_overlays
		ORDER BY section, sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("repository: get static overlays: %w", err)
	}
	defer rows.Close()

	overlays := make([]models.StaticOverlay, 0)
	for rows.Next() {
		var o models.StaticOverlay
		if err := rows.Scan(
			&o.ID, &o.Key, &o.Label, &o.Section, &o.AssetType, &o.Kind, &o.Color,
			&o.MinLon, &o.MinLat, &o.MaxLon, &o.MaxLat, &o.Status,
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
