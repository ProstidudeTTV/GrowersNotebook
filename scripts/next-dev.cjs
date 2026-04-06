/**
 * Next dev: bind address/port from env (avoid hardcoding 0.0.0.0 in package.json).
 * NEXT_DEV_BIND defaults to 127.0.0.1; set NEXT_DEV_BIND=0.0.0.0 in .env for LAN.
 */
const { spawn } = require("child_process");
const path = require("path");

const shell = process.platform === "win32";
const root = path.resolve(__dirname, "..");
const webDir = path.join(root, "apps", "web");
const bind = process.env.NEXT_DEV_BIND?.trim() || "127.0.0.1";
const port = process.env.NEXT_DEV_PORT?.trim() || "3000";

const child = spawn(
  "npx",
  ["next", "dev", "--turbopack", "-p", port, "-H", bind],
  { cwd: webDir, stdio: "inherit", shell },
);

child.on("exit", (code) => process.exit(code ?? 0));
