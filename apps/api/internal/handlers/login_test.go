package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

type fakeUserGetter struct {
	user *models.User
	err  error
}

func (f fakeUserGetter) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	return f.user, f.err
}

func TestLogin(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	validUser := &models.User{ID: 1, Username: "admin_user", PasswordHash: string(hash), RoleID: 2, RoleName: "admin"}
	secret := []byte("test-secret")

	cases := []struct {
		name     string
		repo     fakeUserGetter
		password string
		want     int
	}{
		{"unknown user", fakeUserGetter{err: pgx.ErrNoRows}, "password123", http.StatusUnauthorized},
		{"wrong password", fakeUserGetter{user: validUser}, "wrong", http.StatusUnauthorized},
		{"correct password", fakeUserGetter{user: validUser}, "password123", http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(loginRequest{Username: "admin_user", Password: tc.password})
			req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body))
			w := httptest.NewRecorder()

			Login(tc.repo, secret)(w, req)

			if w.Code != tc.want {
				t.Fatalf("status = %d, want %d", w.Code, tc.want)
			}

			if tc.want != http.StatusOK {
				return
			}

			var resp loginResponse
			if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			parsed, err := jwt.Parse(resp.Token, func(*jwt.Token) (interface{}, error) { return secret, nil })
			if err != nil || !parsed.Valid {
				t.Fatalf("parse token: %v", err)
			}
			claims := parsed.Claims.(jwt.MapClaims)
			if roleName, _ := claims["role_name"].(string); roleName != "admin" {
				t.Errorf("role_name = %q, want %q", roleName, "admin")
			}
			if roleID, _ := claims["role_id"].(float64); int(roleID) != 2 {
				t.Errorf("role_id = %v, want 2", roleID)
			}
		})
	}
}

func TestLogin_MalformedBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader([]byte("not json")))
	w := httptest.NewRecorder()

	Login(fakeUserGetter{err: errors.New("should not be called")}, []byte("secret"))(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}
