/**
 * PATCH growers-notebook-web and growers-notebook-api build/start commands via Render API.
 * Fetches each service first to verify shape; PATCH sends only envSpecificDetails (see buildPatchPayload).
 *
 * Usage:
 *   $env:RENDER_API_KEY = 'rnd_...'   # PowerShell
 *   pnpm run render:patch-notebook-services
 *
 * Options:
 *   --dry-run   Print GET + PATCH bodies only
 */
const API = "https://api.render.com/v1";

const WEB_SERVICE_ID = "srv-d79imdmdqaus73dh2kj0";
const API_SERVICE_ID = "srv-d79imc14tr6s73cuit3g";

const dryRun = process.argv.includes("--dry-run");

const token = process.env.RENDER_API_KEY?.trim();
if (!token && !dryRun) {
  console.error(
    "Set RENDER_API_KEY (Dashboard → Account Settings → API Keys), then re-run.\nOr copy the Build Command lines from render.yaml (Dashboard URGENT section).\nUse --dry-run with a key to print merged PATCH JSON.",
  );
  process.exit(1);
}
if (!token && dryRun) {
  console.log(
    "No RENDER_API_KEY: open render.yaml and copy the Web/API Build Command lines into each service Settings, then Clear cache & deploy.",
  );
  process.exit(0);
}

async function getService(serviceId) {
  const res = await fetch(`${API}/services/${serviceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${serviceId} → ${res.status} ${text.slice(0, 800)}`);
  }
  return JSON.parse(text);
}

/** Only envSpecificDetails — merging full serviceDetails re-sends ipAllowList etc. and returns 400 on non-Enterprise. */
function buildPatchPayload({ buildCommand, startCommand }) {
  return {
    serviceDetails: {
      envSpecificDetails: {
        buildCommand,
        startCommand,
      },
    },
  };
}

async function patchService(serviceId, commands) {
  const existing = await getService(serviceId);
  if (!existing.serviceDetails?.envSpecificDetails) {
    throw new Error(`GET ${serviceId}: missing serviceDetails.envSpecificDetails`);
  }
  const body = buildPatchPayload(commands);
  if (dryRun) {
    console.log(`\n--- PATCH ${serviceId} ---\n`, JSON.stringify(body, null, 2));
    return;
  }
  const res = await fetch(`${API}/services/${serviceId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PATCH ${serviceId} → ${res.status} ${text.slice(0, 1200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  console.log("Patching growers-notebook-web…");
  await patchService(WEB_SERVICE_ID, {
    buildCommand: "node scripts/render-build-web.mjs",
    startCommand: "npx pnpm@9.15.9 --filter @growers/web start",
  });
  console.log("  OK");

  console.log("Patching growers-notebook-api…");
  await patchService(API_SERVICE_ID, {
    buildCommand: "node scripts/render-build-api.mjs",
    startCommand: "npx pnpm@9.15.9 --filter @growers/api start:prod",
  });
  console.log("  OK");

  if (!dryRun) {
    console.log("Done. In the dashboard run Manual Deploy → Clear build cache & deploy (or push main).");
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
