/**
 * Deletes legacy Matrix/Synapse infrastructure on Render (no longer used after Messenger DMs).
 *
 * Requires: RENDER_API_KEY (Dashboard → Account → API Keys)
 *
 * Usage (PowerShell):
 *   $env:RENDER_API_KEY = 'rnd_...'
 *   node scripts/render-delete-legacy-matrix.mjs
 *
 * Optional: skip deleting growers-matrix-postgres:
 *   node scripts/render-delete-legacy-matrix.mjs --skip-matrix-postgres
 */
const API = "https://api.render.com/v1";

const SYNAPSE_SERVICE_ID = "srv-d79j6sedqaus73dh90dg";
const SYNAPSE_DB_ID = "dpg-d79j6kudqaus73dh8t40-a";
const MATRIX_POSTGRES_ID = "dpg-d79imb14tr6s73cuish0-a";

const token = process.env.RENDER_API_KEY?.trim();
if (!token) {
  console.error(
    "Set RENDER_API_KEY (Render Dashboard → Account Settings → API Keys), then re-run.",
  );
  process.exit(1);
}

const skipMatrixPg = process.argv.includes("--skip-matrix-postgres");

async function del(path) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (res.status === 204) return;
  const body = await res.text();
  throw new Error(`${path} → ${res.status} ${body.slice(0, 500)}`);
}

async function main() {
  console.log("Deleting growers-synapse web service…");
  await del(`/services/${SYNAPSE_SERVICE_ID}`);
  console.log("  OK");

  console.log("Deleting growers-synapse-db Postgres…");
  await del(`/postgres/${SYNAPSE_DB_ID}`);
  console.log("  OK");

  if (!skipMatrixPg) {
    console.log("Deleting growers-matrix-postgres…");
    await del(`/postgres/${MATRIX_POSTGRES_ID}`);
    console.log("  OK");
  } else {
    console.log("Skipped growers-matrix-postgres (--skip-matrix-postgres).");
  }

  console.log("Done. Confirm in https://dashboard.render.com");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
