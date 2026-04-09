/**
 * Render web build. Linux/Render: /bin/sh + npx pnpm (no bare pnpm; no bash).
 * Dashboard Build Command: node scripts/render-build-web.mjs (or npm run render:build:web)
 */
import { spawnSync } from "node:child_process";

const sha = (process.env.RENDER_GIT_COMMIT || "dev").replace(/[^a-f0-9]/gi, "") || "dev";
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
  runNpxPnpm(["install", "--frozen-lockfile"], {
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_BUILD_ID: sha,
  });
  runNpxPnpm(["--filter", "@growers/web", "build"], {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_BUILD_ID: sha,
  });
} else {
  const line = `export NEXT_PUBLIC_APP_BUILD_ID="${sha}" && NODE_ENV=development npx --yes pnpm@9.15.9 install --frozen-lockfile && NODE_ENV=production npx --yes pnpm@9.15.9 --filter @growers/web build`;
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
