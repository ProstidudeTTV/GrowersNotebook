#!/usr/bin/env sh
# Render native images include `pnpm` (see https://render.com/docs/native-environments).
# Avoid corepack/npx. Dashboard Build Command: sh scripts/render-build-api.sh
set -eu
NODE_ENV=development pnpm install --frozen-lockfile
pnpm --filter @growers/api build
