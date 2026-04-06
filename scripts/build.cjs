/**
 * Production builds without Turbo (no global pnpm required).
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shell = process.platform === "win32";

function run(title, cmd, cwd) {
  console.log(`\n>>> ${title}\n`);
  execSync(cmd, { cwd, stdio: "inherit", shell });
}

run("API (Nest)", "npx nest build", path.join(root, "apps", "api"));
run("Web (Next)", "npx next build", path.join(root, "apps", "web"));
