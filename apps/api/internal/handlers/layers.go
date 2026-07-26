package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// layersGetter is the subset of *repository.Repository Layers needs, kept
// as an interface so the handler can be tested without a live DB.
type layersGetter interface {
	GetLayersByRoleID(ctx context.Context, roleID int) ([]models.Layer, error)
}

type geoJSONFeature struct {
	Type       string          `json:"type"`
	Properties map[string]any  `json:"properties"`
	Geometry   json.RawMessage `json:"geometry"`
}

type featureCollection struct {
	Type     string           `json:"type"`
	Features []geoJSONFeature `json:"features"`
}

// Layers returns the GeoJSON FeatureCollection of layers authorized for the
// role_id injected into the request context by the Auth middleware.
func Layers(repo layersGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		roleID, ok := RoleIDFromContext(r.Context())
		if !ok {
			http.Error(w, "missing role", http.StatusUnauthorized)
			return
		}

		layers, err := repo.GetLayersByRoleID(r.Context(), roleID)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		fc := featureCollection{Type: "FeatureCollection", Features: make([]geoJSONFeature, 0, len(layers))}
		for _, l := range layers {
			fc.Features = append(fc.Features, geoJSONFeature{
				Type:       "Feature",
				Properties: map[string]any{"id": l.ID, "name": l.Name},
				Geometry:   json.RawMessage(l.GeoJSON),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(fc)
	}
}
