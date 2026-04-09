#!/usr/bin/env bash
# Render web service: keep in sync with render.yaml. Dashboard build command should be:
#   bash scripts/render-build-web.sh
set -euo pipefail
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export NEXT_PUBLIC_APP_BUILD_ID="${RENDER_GIT_COMMIT:-dev}"
corepack enable
corepack prepare pnpm@9.15.9 --activate
NODE_ENV=development pnpm install --frozen-lockfile
NODE_ENV=production pnpm --filter @growers/web build
