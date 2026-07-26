package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

type fakeLayersGetter struct {
	layers []models.Layer
	err    error
}

func (f fakeLayersGetter) GetLayersByRoleID(ctx context.Context, roleID int) ([]models.Layer, error) {
	return f.layers, f.err
}

func TestLayers(t *testing.T) {
	regularUserLayers := []models.Layer{
		{ID: 1, Name: "city_border", GeoJSON: `{"type":"Polygon","coordinates":[]}`},
		{ID: 2, Name: "roads", GeoJSON: `{"type":"LineString","coordinates":[]}`},
	}

	cases := []struct {
		name         string
		repo         fakeLayersGetter
		hasRole      bool
		wantStatus   int
		wantFeatures int
	}{
		{"no role in context", fakeLayersGetter{}, false, http.StatusUnauthorized, 0},
		{"repo error", fakeLayersGetter{err: errors.New("db down")}, true, http.StatusInternalServerError, 0},
		{"regular_user sees 2 layers", fakeLayersGetter{layers: regularUserLayers}, true, http.StatusOK, 2},
		{"no layers", fakeLayersGetter{layers: nil}, true, http.StatusOK, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/layers", nil)
			if tc.hasRole {
				ctx := context.WithValue(req.Context(), ctxKeyRoleID, 1)
				req = req.WithContext(ctx)
			}
			w := httptest.NewRecorder()

			Layers(tc.repo)(w, req)

			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tc.wantStatus)
			}
			if tc.wantStatus != http.StatusOK {
				return
			}

			var fc featureCollection
			if err := json.NewDecoder(w.Body).Decode(&fc); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if fc.Type != "FeatureCollection" {
				t.Errorf("type = %q, want FeatureCollection", fc.Type)
			}
			if len(fc.Features) != tc.wantFeatures {
				t.Errorf("features = %d, want %d", len(fc.Features), tc.wantFeatures)
			}
		})
	}
}
