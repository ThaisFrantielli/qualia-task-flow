#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo ".env not found in repo root. Aborting." >&2
  exit 1
fi

get() {
  local key="$1"
  local line
  line=$(grep -m1 "^${key}=" "$ENV_FILE" || true)
  if [ -z "$line" ]; then
    echo ""
    return
  fi
  local val
  val=${line#*=}
  # strip surrounding quotes if present
  val=$(printf "%s" "$val" | sed -E 's/^"(.*)"$/\1/')
  printf "%s" "$val"
}

keys=(
  SQL_SERVER
  SQL_PORT
  SQL_USER
  SQL_PASSWORD
  SQL_DATABASE

  PG_POOLER_HOST
  PG_POOLER_PORT
  PG_POOLER_USER
  PG_PASSWORD
  PG_DATABASE

  HEAVY_PG_POOLER_HOST
  HEAVY_PG_POOLER_PORT
  HEAVY_PG_POOLER_USER
  HEAVY_PG_PASSWORD
  HEAVY_PG_DATABASE

  SUPABASE_SERVICE_ROLE_KEY
  VITE_SUPABASE_URL
)

echo "This script will create/update GitHub repository secrets using values from $ENV_FILE."
echo "Make sure you have the GitHub CLI 'gh' installed and authenticated with access to this repository."
read -p "Proceed? (y/N) " answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
  echo "Aborted by user.";
  exit 1
fi

for k in "${keys[@]}"; do
  v=$(get "$k")
  if [ -z "$v" ]; then
    echo "Skipping $k (not set in $ENV_FILE)"
    continue
  fi
  echo "Setting secret $k..."
  # use gh to set secret reading from stdin to avoid exposing in command history
  printf "%s" "$v" | gh secret set "$k"
done

echo "All done. Verify secrets in GitHub Actions > Secrets and variables." 
