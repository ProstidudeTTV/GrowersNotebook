/**
 * Next production build: always run `next build` with NODE_ENV=production.
 * If NODE_ENV=development leaks into this step (CI, pnpm, or shell quirks),
 * Next can fail while prerendering error pages ("<Html> should not be imported…").
 */
const { spawn } = require("child_process");
const path = require("path");

const shell = process.platform === "win32";
const root = path.resolve(__dirname, "..");
const webDir = path.join(root, "apps", "web");

process.env.NODE_ENV = "production";

const child = spawn("npx", ["next", "build"], {
  cwd: webDir,
  stdio: "inherit",
  shell,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
