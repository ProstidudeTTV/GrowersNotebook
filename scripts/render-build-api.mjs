/**
 * Render API build without bash/sh.
 * Dashboard Build Command: node scripts/render-build-api.mjs
 */
import { spawnSync } from "node:child_process";

function run(cmd, args, extraEnv) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  const code = result.status;
  if (code !== 0) process.exit(code == null ? 1 : code);
}

run("pnpm", ["install", "--frozen-lockfile"], { NODE_ENV: "development" });
run("pnpm", ["--filter", "@growers/api", "build"], {});
