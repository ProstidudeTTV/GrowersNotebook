/**
 * Render API build. Linux/Render: same as `sh scripts/render-build-api.sh` — image `pnpm`, no npx.
 * Dashboard: node scripts/render-build-api.mjs | npm run render:build:api | sh scripts/render-build-api.sh
 */
import { spawnSync } from "node:child_process";

const pnpmArgs = ["--yes", "pnpm@9.15.9"];

function runNpxPnpm(npmArgs, extraEnv) {
  const result = spawnSync("npx", pnpmArgs.concat(npmArgs), {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NPM_CONFIG_YES: "true", ...extraEnv },
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.platform === "win32") {
  runNpxPnpm(["install", "--frozen-lockfile"], { NODE_ENV: "development" });
  runNpxPnpm(["--filter", "@growers/api", "build"], {});
} else {
  const line = `NODE_ENV=development pnpm install --frozen-lockfile && pnpm --filter @growers/api build`;
  const result = spawnSync(line, {
    shell: "/bin/sh",
    stdio: "inherit",
    env: { ...process.env, NPM_CONFIG_YES: "true" },
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}
