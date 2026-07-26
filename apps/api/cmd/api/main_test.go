package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakePinger struct{ err error }

func (f fakePinger) Ping(ctx context.Context) error { return f.err }

func TestHealthzHandler(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{"db up", nil, http.StatusOK},
		{"db down", errors.New("connect failed"), http.StatusServiceUnavailable},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
			w := httptest.NewRecorder()

			healthzHandler(fakePinger{err: tc.err})(w, req)

			if w.Code != tc.want {
				t.Errorf("status = %d, want %d", w.Code, tc.want)
			}
		})
	}
}
