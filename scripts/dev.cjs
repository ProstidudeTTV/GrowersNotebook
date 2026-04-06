/**
 * Run Next (web) + Nest (api) without global `pnpm` or Turbo resolving the pnpm binary.
 * From repo root: `npm run dev` or `node scripts/dev.cjs`
 *
 * Run from repo root so ports 3000/3001 are freed first. If you still see EADDRINUSE:
 *   npm run ports:free
 */
const { spawn } = require("child_process");
const path = require("path");
const { freeDevPorts } = require("./free-dev-ports.cjs");

const root = path.resolve(__dirname, "..");
const shell = process.platform === "win32";

freeDevPorts();

function run(label, command, args, cwd, extraEnv) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell,
    env: { ...process.env, ...extraEnv },
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[${label}] killed (${signal})`);
    } else if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

const apiPort = process.env.API_DEV_PORT?.trim() || "3001";

/** Web: node scripts/next-dev.cjs (NEXT_DEV_BIND / NEXT_DEV_PORT). API: set PORT + LISTEN_HOST in env or rely on API_DEV_PORT. */
const web = run("web", "node", ["scripts/next-dev.cjs"], root, {});
const api = run(
  "api",
  "npx",
  ["nest", "start", "--watch"],
  path.join(root, "apps", "api"),
  {
    PORT: apiPort,
    LISTEN_HOST: process.env.LISTEN_HOST?.trim() || "127.0.0.1",
  },
);

function shutdown() {
  web.kill();
  api.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
