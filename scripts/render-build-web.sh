#!/usr/bin/env sh
# Render native images include `pnpm` (see https://render.com/docs/native-environments).
# Avoid corepack/npx — corepack can exit non-zero on some builders and fails the deploy in ~1s.
# Dashboard Build Command: sh scripts/render-build-web.sh
set -eu
export NEXT_PUBLIC_APP_BUILD_ID="${RENDER_GIT_COMMIT:-dev}"
NODE_ENV=development pnpm install --frozen-lockfile
NODE_ENV=production pnpm --filter @growers/web build
