/**
 * Render web build without bash/sh (avoids missing shell or corepack issues).
 * Dashboard Build Command: node scripts/render-build-web.mjs
 */
import { spawnSync } from "node:child_process";

function run(cmd, args, extraEnv) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    // Windows: pnpm is often a shim; Linux (Render): real binary in PATH
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  const code = result.status;
  if (code !== 0) process.exit(code == null ? 1 : code);
}

process.env.NEXT_PUBLIC_APP_BUILD_ID =
  process.env.RENDER_GIT_COMMIT || process.env.NEXT_PUBLIC_APP_BUILD_ID || "dev";

run("pnpm", ["install", "--frozen-lockfile"], { NODE_ENV: "development" });
run("pnpm", ["--filter", "@growers/web", "build"], { NODE_ENV: "production" });
