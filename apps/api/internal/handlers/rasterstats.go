package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/rasterstats"
)

// overlayStatsGetter is the subset of *repository.Repository RasterStats needs:
// the file to measure, and the extent that turns pixels into ground area.
type overlayStatsGetter interface {
	GetStaticOverlay(ctx context.Context, key string) (models.StaticOverlay, error)
}

// statsCache memoises a measurement against the file it was taken from.
//
// Measuring means decoding a 20-megapixel PNG and walking every pixel — about
// a second, and ~90 MB of decoded image. The result only changes when the file
// or its extent does (the extent turns pixels into area), so it is cached
// against the file's size and modification time plus the bounds, and a
// single mutex serialises the work: that both protects the map and stops a
// burst of requests from decoding several images at once.
type statsCache struct {
	mu      sync.Mutex
	entries map[string]cachedStats
}

type cachedStats struct {
	modUnix int64
	size    int64
	bounds  rasterstats.Bounds
	stats   *rasterstats.Stats
}

func newStatsCache() *statsCache {
	return &statsCache{entries: make(map[string]cachedStats)}
}

func (c *statsCache) get(key, path string, b rasterstats.Bounds) (*rasterstats.Stats, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if hit, ok := c.entries[key]; ok && hit.modUnix == info.ModTime().Unix() && hit.size == info.Size() && hit.bounds == b {
		return hit.stats, nil
	}

	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	stats, err := rasterstats.Compute(f, b)
	if err != nil {
		return nil, err
	}

	c.entries[key] = cachedStats{modUnix: info.ModTime().Unix(), size: info.Size(), bounds: b, stats: stats}
	return stats, nil
}

// RasterStats measures how much ground each colour in a raster covers.
//
// The heavy per-pixel work happens here rather than in the browser: the source
// images are 20+ megapixels, and shipping one to a client to count would cost
// far more than the numbers are worth. What comes back is a colour histogram
// with areas; the frontend matches the colours to its legend, because the
// class palettes belong to the legend and not to the pixel counter.
func RasterStats(repo overlayStatsGetter, dataRoot string) http.HandlerFunc {
	cache := newStatsCache()
	root := filepath.Clean(dataRoot)

	return func(w http.ResponseWriter, r *http.Request) {
		key := chi.URLParam(r, "key")

		overlay, err := repo.GetStaticOverlay(r.Context(), key)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "overlay not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		// Only a placed raster can be measured: a vector has no pixels, and
		// without an extent there is nothing to convert pixels into area with.
		if overlay.AssetType != "raster" || overlay.FilePath == "" ||
			overlay.MinLon == nil || overlay.MinLat == nil ||
			overlay.MaxLon == nil || overlay.MaxLat == nil {
			http.Error(w, "overlay has no measurable raster", http.StatusNotFound)
			return
		}

		// Same containment as OverlayData: the path is DB-controlled, but
		// cleaning it against a leading separator stops a "../.." row climbing
		// out of dataRoot.
		full := filepath.Join(root, filepath.Clean(string(filepath.Separator)+overlay.FilePath))

		stats, err := cache.get(key, full, rasterstats.Bounds{
			MinLon: *overlay.MinLon,
			MinLat: *overlay.MinLat,
			MaxLon: *overlay.MaxLon,
			MaxLat: *overlay.MaxLat,
		})
		if errors.Is(err, os.ErrNotExist) {
			http.Error(w, "overlay asset not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		// Long: these numbers change only when the imagery is replaced, and
		// the panel asks for them every time a year is stepped through.
		w.Header().Set("Cache-Control", "public, max-age=3600")
		json.NewEncoder(w).Encode(stats)
	}
}
