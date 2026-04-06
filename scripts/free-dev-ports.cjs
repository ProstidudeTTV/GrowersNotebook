/**
 * Kill processes listening on dev ports (3000 web, 3001 API).
 * Use when you see EADDRINUSE: `node scripts/free-dev-ports.cjs`
 * or `npm run ports:free` from the repo root.
 */
const { execSync } = require("child_process");

/** @param {number} port */
function killListenersOnPortWin(port) {
  let out;
  try {
    out = execSync("cmd /c netstat -ano", {
      encoding: "utf8",
      windowsHide: true,
    });
  } catch {
    return;
  }
  const pids = new Set();
  const suffix = `:${port}`;
  for (const line of out.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.includes("LISTENING")) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 5) continue;
    const local = parts[1];
    if (!local.endsWith(suffix)) continue;
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, {
        stdio: "ignore",
        windowsHide: true,
      });
      console.log(`[ports] Stopped PID ${pid} (was listening on ${port})`);
    } catch {
      /* process may have exited */
    }
  }
}

function freeDevPorts() {
  if (process.platform === "win32") {
    for (const port of [3000, 3001]) {
      killListenersOnPortWin(port);
    }
    return;
  }
  for (const port of [3000, 3001]) {
    try {
      const out = execSync(`lsof -ti:${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = out
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), "SIGKILL");
          console.log(`[ports] Stopped PID ${pid} (was listening on ${port})`);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* nothing listening */
    }
  }
}

module.exports = { freeDevPorts };

if (require.main === module) {
  freeDevPorts();
}
