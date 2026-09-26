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
			COALESCE(color_field, ''), categories, COALESCE(popup_fields, '{}'),
			COALESCE(file_path, ''), min_lon, min_lat, max_lon, max_lat, status, default_on,
			EXISTS (SELECT 1 FROM overlay_class_stats s WHERE s.overlay_id = static_overlays.id)
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
			&o.ColorField, &o.Categories, &o.PopupFields,
			&o.FilePath, &o.MinLon, &o.MinLat, &o.MaxLon, &o.MaxLat, &o.Status, &o.DefaultOn,
			&o.HasStats,
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
		SELECT id, key, label, parent_id, sort_order, own_picker, draw_below
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
		if err := rows.Scan(&g.ID, &g.Key, &g.Label, &g.ParentID, &g.SortOrder, &g.OwnPicker, &g.DrawBelow); err != nil {
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

// GetOverlayClassStats returns the client's delivered class statistics for
// the overlay with the given key, in delivered order: areas in square metres
// and shares 0..1, converted here so the API speaks the same units as the
// measured statistics. Empty (not an error) for an overlay with none, or for
// an unknown key.
func (r *Repository) GetOverlayClassStats(ctx context.Context, key string) ([]models.OverlayClassStat, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT s.class_value, s.label, COALESCE(s.class_group, ''),
			s.area_ha * 10000, s.percentage / 100
		FROM overlay_class_stats s
		JOIN static_overlays o ON o.id = s.overlay_id
		WHERE o.key = $1
		ORDER BY s.sort_order, s.class_value
	`, key)
	if err != nil {
		return nil, fmt.Errorf("repository: get overlay class stats: %w", err)
	}
	defer rows.Close()

	stats := make([]models.OverlayClassStat, 0)
	for rows.Next() {
		var s models.OverlayClassStat
		if err := rows.Scan(&s.Value, &s.Label, &s.Group, &s.AreaSqM, &s.Share); err != nil {
			return nil, fmt.Errorf("repository: scan overlay class stat: %w", err)
		}
		stats = append(stats, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("repository: get overlay class stats: %w", err)
	}

	return stats, nil
}
