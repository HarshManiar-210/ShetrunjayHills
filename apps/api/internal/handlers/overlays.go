package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// overlaysGetter is the subset of *repository.Repository Overlays needs.
type overlaysGetter interface {
	GetStaticOverlays(ctx context.Context) ([]models.StaticOverlay, error)
}

// overlayFilePathGetter is the subset of *repository.Repository OverlayData
// needs.
type overlayFilePathGetter interface {
	GetStaticOverlayFilePath(ctx context.Context, key string) (string, error)
}

// Overlays lists every static overlay's display metadata — never a
// filesystem path, only what the frontend needs to render a switch and, by
// key, ask OverlayData for the underlying asset.
func Overlays(repo overlaysGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		overlays, err := repo.GetStaticOverlays(r.Context())
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		// Short, but long enough that the dashboard's own remounts (a login,
		// a hard refresh) don't re-ask for a list that only changes when the
		// seed data does.
		w.Header().Set("Cache-Control", "public, max-age=60")
		json.NewEncoder(w).Encode(overlays)
	}
}

// OverlayData serves the raw file (GeoJSON or raster image) behind a static
// overlay's key, resolving its DB-stored path against dataRoot. The path
// itself never reaches the client — only bytes.
func OverlayData(repo overlayFilePathGetter, dataRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := chi.URLParam(r, "key")

		relPath, err := repo.GetStaticOverlayFilePath(r.Context(), key)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "overlay not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		// A 'pending' row (see static_overlays.status) has no file yet — an
		// empty relPath would otherwise resolve to dataRoot itself, and
		// http.ServeFile serves a directory listing rather than 404ing.
		if relPath == "" {
			http.Error(w, "overlay not found", http.StatusNotFound)
			return
		}

		// relPath is DB-controlled, not user input, but forcing it to be
		// absolute-then-cleaned before joining means a "../../etc/passwd" row
		// can't climb out of dataRoot — Clean collapses leading ".." against
		// the "/" instead of escaping it.
		root := filepath.Clean(dataRoot)
		full := filepath.Join(root, filepath.Clean(string(filepath.Separator)+relPath))

		// Overlay files are deployment assets, not per-request data, and the
		// vector ones run to tens of megabytes — re-downloading one because
		// its switch was flipped off and on again is the most avoidable wait
		// in the app. ServeFile still sends Last-Modified, so the
		// revalidation once max-age lapses is a 304 rather than a re-send.
		w.Header().Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

		// Go's mime table has no .geojson entry, so ServeFile would otherwise
		// sniff these to text/plain. ServeFile leaves an already-set
		// Content-Type alone.
		if strings.EqualFold(filepath.Ext(full), ".geojson") {
			w.Header().Set("Content-Type", "application/geo+json")
		}

		http.ServeFile(w, r, full)
	}
}
