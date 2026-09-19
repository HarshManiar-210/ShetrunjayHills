package handlers

import (
	"bytes"
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

			Overlays(tc.repo, t.TempDir())(w, req)

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

// Size is measured off disk rather than read from the DB, so it has to be
// right for a real file, absent for a row whose file has not been delivered,
// and absent (not an error) for a path that no longer exists.
func TestOverlaysStampsAssetSize(t *testing.T) {
	dataRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dataRoot, "vector-data"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	body := []byte(`{"type":"FeatureCollection","features":[]}`)
	if err := os.WriteFile(filepath.Join(dataRoot, "vector-data", "Roads.geojson"), body, 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	repo := fakeOverlaysGetter{overlays: []models.StaticOverlay{
		{Key: "roads", FilePath: "vector-data/Roads.geojson"},
		{Key: "pending", FilePath: ""},
		{Key: "missing", FilePath: "vector-data/NotDelivered.geojson"},
	}}

	req := httptest.NewRequest(http.MethodGet, "/api/overlays", nil)
	w := httptest.NewRecorder()
	Overlays(repo, dataRoot)(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var got []models.StaticOverlay
	if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	want := map[string]int64{"roads": int64(len(body)), "pending": 0, "missing": 0}
	for _, o := range got {
		if o.SizeBytes != want[o.Key] {
			t.Errorf("%s size_bytes = %d, want %d", o.Key, o.SizeBytes, want[o.Key])
		}
	}

	// file_path is json:"-" and must stay server-side whatever else changes.
	if bytes.Contains(w.Body.Bytes(), []byte("vector-data")) {
		t.Error("response leaked a filesystem path")
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
		// A 'pending' static_overlays row (no data yet) has an empty file_path.
		{"pending overlay has no file yet", fakeOverlayFilePathGetter{path: ""}, http.StatusNotFound},
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
