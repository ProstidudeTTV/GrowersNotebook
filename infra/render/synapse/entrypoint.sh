#!/usr/bin/env bash
set -euo pipefail

: "${PORT:=8008}"
export PORT
export SYNAPSE_HTTP_PORT="${SYNAPSE_HTTP_PORT:-$PORT}"
export SYNAPSE_CONFIG_DIR="${SYNAPSE_CONFIG_DIR:-/data}"
export SYNAPSE_DATA_DIR="${SYNAPSE_DATA_DIR:-/data}"
export SYNAPSE_CONFIG_PATH="${SYNAPSE_CONFIG_PATH:-/data/homeserver.yaml}"
export SYNAPSE_REPORT_STATS="${SYNAPSE_REPORT_STATS:-no}"

: "${SYNAPSE_SERVER_NAME:?Set SYNAPSE_SERVER_NAME (e.g. your-service.onrender.com)}"
: "${SYNAPSE_PUBLIC_BASE_URL:?Set SYNAPSE_PUBLIC_BASE_URL (https://your-service.onrender.com)}"
: "${SYNAPSE_JWT_SECRET:?Set SYNAPSE_JWT_SECRET (must match Nest API SYNAPSE_JWT_SECRET)}"
: "${DATABASE_URL:?Set DATABASE_URL (Render Postgres link)}"

mkdir -p /data

if [[ ! -f "${SYNAPSE_CONFIG_PATH}" ]]; then
  echo "First boot: generating ${SYNAPSE_CONFIG_PATH}"
  /usr/local/bin/python /start.py generate
fi

echo "Patching homeserver.yaml for Postgres, JWT, Render listener, and public_baseurl…"
/usr/local/bin/python /patch_config.py
chown -R 991:991 /data

exec /usr/local/bin/python /start.py run
