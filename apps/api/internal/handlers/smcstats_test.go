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

type fakeSmcCountsGetter struct {
	counts []models.SmcZoneCount
	err    error
}

func (f fakeSmcCountsGetter) GetSmcZoneCounts(ctx context.Context) ([]models.SmcZoneCount, error) {
	return f.counts, f.err
}

func TestSmcStats(t *testing.T) {
	tests := []struct {
		name     string
		repo     fakeSmcCountsGetter
		wantCode int
		wantRows int
	}{
		{"repo error", fakeSmcCountsGetter{err: errors.New("db down")}, http.StatusInternalServerError, 0},
		{"lists counts", fakeSmcCountsGetter{counts: []models.SmcZoneCount{
			{OverlayKey: "checkDam", Structure: "Checkdam", SetLabel: "Existing", ZoneNo: 1, ZoneName: "Main Temple Ridge", Count: 10},
		}}, http.StatusOK, 1},
		{"no counts", fakeSmcCountsGetter{counts: []models.SmcZoneCount{}}, http.StatusOK, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			SmcStats(tt.repo)(rec, httptest.NewRequest(http.MethodGet, "/api/smc-stats", nil))
			if rec.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantCode)
			}
			if tt.wantCode != http.StatusOK {
				return
			}
			var got []models.SmcZoneCount
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if len(got) != tt.wantRows {
				t.Fatalf("rows = %d, want %d", len(got), tt.wantRows)
			}
		})
	}
}
