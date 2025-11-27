#!/usr/bin/env bash
set -euo pipefail

# Apply SQL migration files in database/migrations to the target Postgres database.
# Usage:
#   DATABASE_URL="postgres://user:pass@host:5432/dbname" npm run db:sync
# or
#   export DATABASE_URL="..." && ./scripts/sync_supabase.sh

MIGRATIONS_DIR="$(dirname "$0")/../database/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Provide a Postgres connection string."
  echo "Example: DATABASE_URL=\"postgres://user:pass@host:5432/dbname\" npm run db:sync"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed or not on PATH. Install the Postgres client (psql)."
  exit 1
fi

echo "Applying SQL migrations from: $MIGRATIONS_DIR"

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No .sql files found in $MIGRATIONS_DIR"
  exit 0
fi

for f in "${files[@]}"; do
  echo "----"
  echo "Applying: $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
  echo "Applied: $f"
done

echo "All migrations applied."
