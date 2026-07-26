package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// userGetter is the subset of *repository.Repository Login needs, kept as
// an interface so the handler can be tested without a live DB.
type userGetter interface {
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
}

// Login authenticates against the users table and issues a JWT carrying
// role_id/role_name so downstream handlers never need to re-query the role.
func Login(repo userGetter, jwtSecret []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		user, err := repo.GetUserByUsername(r.Context(), req.Username)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		claims := jwt.MapClaims{
			"sub":       user.Username,
			"role_id":   user.RoleID,
			"role_name": user.RoleName,
			"exp":       time.Now().Add(24 * time.Hour).Unix(),
		}
		signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(loginResponse{Token: signed})
	}
}
