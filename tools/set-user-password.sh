#!/usr/bin/env bash
#
# Set a login's password in the running database.
#
# Why: the seed creates the site's account with an unusable placeholder hash
# ('!', which bcrypt never matches), so no password — not even its hash — is
# kept in the repo. Run this once after the database is created, and again
# whenever the password changes. Postgres does the bcrypt hashing (pgcrypto's
# crypt() with a 'bf' salt writes the $2a$ hashes the API's bcrypt check
# reads), so nothing beyond the compose stack is needed.
#
# The password is read without echo and handed to psql through an environment
# variable rather than an argument, so it doesn't show in the process list or
# shell history.
#
# Usage:  tools/set-user-password.sh <username>
# e.g.    tools/set-user-password.sh admin@shantrunjayforest.org

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <username>" >&2
  exit 1
fi

read -rsp "New password for $1: " NEW_PASSWORD; echo
read -rsp "Repeat it: " REPEAT; echo
if [ "$NEW_PASSWORD" != "$REPEAT" ]; then
  echo "passwords do not match" >&2
  exit 1
fi
if [ -z "$NEW_PASSWORD" ]; then
  echo "password is empty" >&2
  exit 1
fi
export NEW_PASSWORD

docker compose exec -T -e NEW_PASSWORD db \
  psql -U shetrunjay -d shetrunjay -v ON_ERROR_STOP=1 -q -v username="$1" <<'SQL'
\getenv new_password NEW_PASSWORD
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE users SET password_hash = crypt(:'new_password', gen_salt('bf', 10))
WHERE username = :'username'
RETURNING username AS password_set_for;
SQL
