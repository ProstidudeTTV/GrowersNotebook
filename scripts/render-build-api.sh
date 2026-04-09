#!/usr/bin/env bash
# Render API service: keep in sync with render.yaml. Dashboard build command should be:
#   bash scripts/render-build-api.sh
set -euo pipefail
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable
corepack prepare pnpm@9.15.9 --activate
NODE_ENV=development pnpm install --frozen-lockfile
pnpm --filter @growers/api build
