package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

type fakeOverlaysGetter struct {
	overlays []models.StaticOverlay
	err      error
}

func (f fakeOverlaysGetter) GetStaticOverlays(ctx context.Context) ([]models.StaticOverlay, error) {
	return f.overlays, f.err
}

func TestOverlays(t *testing.T) {
	overlays := []models.StaticOverlay{
		{ID: 1, Key: "roads", Label: "Roads", Section: "Base Layers", AssetType: "vector", Kind: "line", Color: "#D18B2A"},
	}

	cases := []struct {
		name       string
		repo       fakeOverlaysGetter
		wantStatus int
		wantCount  int
	}{
		{"repo error", fakeOverlaysGetter{err: errors.New("db down")}, http.StatusInternalServerError, 0},
		{"lists overlays", fakeOverlaysGetter{overlays: overlays}, http.StatusOK, 1},
		{"no overlays", fakeOverlaysGetter{overlays: nil}, http.StatusOK, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/overlays", nil)
			w := httptest.NewRecorder()

			Overlays(tc.repo)(w, req)

			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tc.wantStatus)
			}
			if tc.wantStatus != http.StatusOK {
				return
			}

			var got []models.StaticOverlay
			if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if len(got) != tc.wantCount {
				t.Errorf("len(overlays) = %d, want %d", len(got), tc.wantCount)
			}
		})
	}
}

type fakeOverlayFilePathGetter struct {
	path string
	err  error
}

func (f fakeOverlayFilePathGetter) GetStaticOverlayFilePath(ctx context.Context, key string) (string, error) {
	return f.path, f.err
}

func TestOverlayData(t *testing.T) {
	dataRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dataRoot, "vector-data"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dataRoot, "vector-data", "Roads.geojson"), []byte(`{"type":"FeatureCollection"}`), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	cases := []struct {
		name       string
		repo       fakeOverlayFilePathGetter
		wantStatus int
	}{
		{"unknown key", fakeOverlayFilePathGetter{err: pgx.ErrNoRows}, http.StatusNotFound},
		{"repo error", fakeOverlayFilePathGetter{err: errors.New("db down")}, http.StatusInternalServerError},
		{"serves file", fakeOverlayFilePathGetter{path: "vector-data/Roads.geojson"}, http.StatusOK},
		// A row whose path tries to climb out of dataRoot resolves back under
		// it instead (see OverlayData), so it 404s rather than serving
		// something outside vector-data/raster-data.
		{"path escapes data root", fakeOverlayFilePathGetter{path: "../../../etc/passwd"}, http.StatusNotFound},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/overlays/roads/data", nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("key", "roads")
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			w := httptest.NewRecorder()

			OverlayData(tc.repo, dataRoot)(w, req)

			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d, body=%s", w.Code, tc.wantStatus, w.Body.String())
			}
		})
	}
}
