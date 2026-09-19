package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
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
//
// Each row is stamped with its asset's size on disk. That is measured here
// rather than stored in the DB because a seeded column drifts the moment a
// file is replaced, and because it lets the frontend warn about a heavy layer
// from data instead of from a hardcoded list of keys (CLAUDE.md's core
// invariant). A stat per row against a warm directory cache is cheap, and the
// response is cached for a minute anyway.
func Overlays(repo overlaysGetter, dataRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		overlays, err := repo.GetStaticOverlays(r.Context())
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		root := filepath.Clean(dataRoot)
		for i := range overlays {
			overlays[i].SizeBytes = assetSize(root, overlays[i].FilePath)
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

// assetSize reports an overlay asset's size in bytes, or 0 when there is no
// file to measure — a 'pending' row, or a path that has not been delivered
// yet. Size is advisory (it drives a "this layer is large" warning), so a
// missing file is not an error worth failing the whole listing over.
//
// relPath is DB-controlled rather than user input, but it is cleaned and
// joined exactly as OverlayData does, so a "../.." row cannot stat its way
// out of dataRoot.
func assetSize(root, relPath string) int64 {
	if relPath == "" {
		return 0
	}
	full := filepath.Join(root, filepath.Clean(string(filepath.Separator)+relPath))
	info, err := os.Stat(full)
	if err != nil || info.IsDir() {
		return 0
	}
	return info.Size()
}
