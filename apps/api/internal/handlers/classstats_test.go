package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

type fakeClassStatsGetter struct {
	classes  []models.OverlayClassStat
	err      error
	overlay  models.StaticOverlay
	overlayE error
}

func (f fakeClassStatsGetter) GetOverlayClassStats(ctx context.Context, key string) ([]models.OverlayClassStat, error) {
	return f.classes, f.err
}

func (f fakeClassStatsGetter) GetStaticOverlay(ctx context.Context, key string) (models.StaticOverlay, error) {
	return f.overlay, f.overlayE
}

func serveOverlayStats(repo fakeClassStatsGetter) *httptest.ResponseRecorder {
	r := chi.NewRouter()
	r.Get("/api/overlays/{key}/stats", OverlayStats(repo, "."))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/overlays/forestCoverFSI/stats", nil))
	return rec
}

func TestOverlayStatsServesDeliveredFigures(t *testing.T) {
	rec := serveOverlayStats(fakeClassStatsGetter{
		classes: []models.OverlayClassStat{
			{Value: "OPEN", Label: "Open Forest", AreaSqM: 30_000, Share: 0.75},
			{Value: "SCRUB", Label: "Scrub", AreaSqM: 10_000, Share: 0.25},
		},
		// A vector overlay: measuring it would 404, so reaching 200 proves
		// the delivered path answered without falling through.
		overlay: models.StaticOverlay{AssetType: "vector"},
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var got deliveredStats
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.Source != "delivered" || got.AreaSqM != 40_000 || len(got.Classes) != 2 {
		t.Fatalf("got %+v, want delivered, 40000 m², 2 classes", got)
	}
}

func TestOverlayStatsFallsBackToMeasuring(t *testing.T) {
	tests := []struct {
		name string
		repo fakeClassStatsGetter
		want int
	}{
		// No delivered rows: RasterStats answers, and for these it refuses.
		{"unknown key", fakeClassStatsGetter{overlayE: pgx.ErrNoRows}, http.StatusNotFound},
		{"vector without figures", fakeClassStatsGetter{overlay: models.StaticOverlay{AssetType: "vector"}}, http.StatusNotFound},
		{"repo error", fakeClassStatsGetter{err: errors.New("db down")}, http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if rec := serveOverlayStats(tt.repo); rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}
