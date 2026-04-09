/**
 * Updates growers-notebook-web and growers-notebook-api build commands via Render API
 * (corepack + bash scripts from the repo). MCP cannot patch services in this workspace.
 *
 * Usage (PowerShell):
 *   $env:RENDER_API_KEY = 'rnd_...'
 *   node scripts/render-patch-notebook-services.mjs
 */
const API = "https://api.render.com/v1";

const WEB_SERVICE_ID = "srv-d79imdmdqaus73dh2kj0";
const API_SERVICE_ID = "srv-d79imc14tr6s73cuit3g";

const token = process.env.RENDER_API_KEY?.trim();
if (!token) {
  console.error(
    "Set RENDER_API_KEY (Dashboard → Account Settings → API Keys), then re-run.",
  );
  process.exit(1);
}

async function patchService(serviceId, { buildCommand, startCommand }) {
  const res = await fetch(`${API}/services/${serviceId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serviceDetails: {
        envSpecificDetails: {
          buildCommand,
          startCommand,
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${serviceId} → ${res.status} ${text.slice(0, 800)}`);
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
    buildCommand: "bash scripts/render-build-web.sh",
    startCommand: "npx pnpm@9.15.9 --filter @growers/web start",
  });
  console.log("  OK");

  console.log("Patching growers-notebook-api…");
  await patchService(API_SERVICE_ID, {
    buildCommand: "bash scripts/render-build-api.sh",
    startCommand: "npx pnpm@9.15.9 --filter @growers/api start:prod",
  });
  console.log("  OK");

  console.log("Done. Trigger a deploy or push to main to rebuild.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
