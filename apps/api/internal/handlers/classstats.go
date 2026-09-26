package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// overlayClassStatsGetter is the subset of *repository.Repository
// OverlayStats needs: the delivered figures, plus what RasterStats needs to
// measure an overlay that has none.
type overlayClassStatsGetter interface {
	overlayStatsGetter
	GetOverlayClassStats(ctx context.Context, key string) ([]models.OverlayClassStat, error)
}

// deliveredStats is the response for an overlay with delivered statistics.
// Source tells it apart from a measurement (which carries no source);
// AreaSqM is the classes' total, the same meaning as a measurement's
// footprint area.
type deliveredStats struct {
	Source  string                    `json:"source"`
	AreaSqM float64                   `json:"area_sq_m"`
	Classes []models.OverlayClassStat `json:"classes"`
}

// OverlayStats serves an overlay's class statistics: the client's own figures
// where they were delivered, otherwise a measurement of the raster's pixels.
//
// The delivered figures win because they come from the source GIS data, which
// a pixel count of the reprojected PNG can only approximate — and they are the
// only statistics a classed vector layer (the FSI layers) can have at all.
// Which overlays have them is rows in overlay_class_stats, not a key list here.
func OverlayStats(repo overlayClassStatsGetter, dataRoot string) http.HandlerFunc {
	measure := RasterStats(repo, dataRoot)

	return func(w http.ResponseWriter, r *http.Request) {
		classes, err := repo.GetOverlayClassStats(r.Context(), chi.URLParam(r, "key"))
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if len(classes) == 0 {
			measure(w, r)
			return
		}

		var total float64
		for _, c := range classes {
			total += c.AreaSqM
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		json.NewEncoder(w).Encode(deliveredStats{Source: "delivered", AreaSqM: total, Classes: classes})
	}
}
