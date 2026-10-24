package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// smcCountsGetter is the subset of *repository.Repository SmcStats needs.
type smcCountsGetter interface {
	GetSmcZoneCounts(ctx context.Context) ([]models.SmcZoneCount, error)
}

// SmcStats serves the client's SMC Statistics table (smc_zone_counts): the
// existing and potential conservation structures in each study-area zone.
// Like the static overlays it describes, it is the same for every visitor.
func SmcStats(repo smcCountsGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		counts, err := repo.GetSmcZoneCounts(r.Context())
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=60")
		json.NewEncoder(w).Encode(counts)
	}
}
