/**
 * PATCH growers-notebook-web and growers-notebook-api build/start commands via Render API.
 * Fetches each service first to verify shape. PATCH sends a minimal serviceDetails body:
 * healthCheckPath (optional) + envSpecificDetails only — never merge full GET serviceDetails (ipAllowList 400).
 *
 * Usage:
 *   $env:RENDER_API_KEY = 'rnd_...'   # PowerShell
 *   pnpm run render:patch-notebook-services
 *
 * Options:
 *   --dry-run   Print GET + PATCH bodies only
 *   --docker    Switch both services to Dockerfile builds (Dockerfile.growers-web / api).
 *               Use after those files exist on the repo branch Render deploys.
 */
const API = "https://api.render.com/v1";

const WEB_SERVICE_ID = "srv-d79imdmdqaus73dh2kj0";
const API_SERVICE_ID = "srv-d79imc14tr6s73cuit3g";

const dryRun = process.argv.includes("--dry-run");
const useDocker = process.argv.includes("--docker");

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

function buildNativePatchPayload({ buildCommand, startCommand, healthCheckPath }) {
  const serviceDetails = {
    envSpecificDetails: {
      buildCommand,
      startCommand,
    },
  };
  if (healthCheckPath != null && healthCheckPath !== "") {
    serviceDetails.healthCheckPath = healthCheckPath;
  }
  return { serviceDetails };
}

/** @param {{ dockerfilePath: string, dockerContext?: string, healthCheckPath?: string }} opts */
function buildDockerPatchPayload({ dockerfilePath, dockerContext = ".", healthCheckPath }) {
  const serviceDetails = {
    env: "docker",
    runtime: "docker",
    envSpecificDetails: {
      dockerContext,
      dockerfilePath,
    },
  };
  if (healthCheckPath != null && healthCheckPath !== "") {
    serviceDetails.healthCheckPath = healthCheckPath;
  }
  return { serviceDetails };
}

async function patchService(serviceId, body) {
  const existing = await getService(serviceId);
  if (!existing.serviceDetails?.envSpecificDetails && !useDocker) {
    throw new Error(`GET ${serviceId}: missing serviceDetails.envSpecificDetails`);
  }
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
  if (useDocker) {
    console.log("Switching growers-notebook-web to Docker…");
    await patchService(
      WEB_SERVICE_ID,
      buildDockerPatchPayload({
        dockerfilePath: "./Dockerfile.growers-web",
        dockerContext: ".",
        healthCheckPath: "/",
      }),
    );
    console.log("  OK");

    console.log("Switching growers-notebook-api to Docker…");
    await patchService(
      API_SERVICE_ID,
      buildDockerPatchPayload({
        dockerfilePath: "./Dockerfile.growers-api",
        dockerContext: ".",
        healthCheckPath: "/health",
      }),
    );
    console.log("  OK");
  } else {
    console.log("Patching growers-notebook-web (native)…");
    await patchService(
      WEB_SERVICE_ID,
      buildNativePatchPayload({
        buildCommand: "sh scripts/render-build-web.sh",
        startCommand: "npx pnpm@9.15.9 --filter @growers/web start",
        healthCheckPath: "/",
      }),
    );
    console.log("  OK");

    console.log("Patching growers-notebook-api (native)…");
    await patchService(
      API_SERVICE_ID,
      buildNativePatchPayload({
        buildCommand: "sh scripts/render-build-api.sh",
        startCommand: "npx pnpm@9.15.9 --filter @growers/api start:prod",
        healthCheckPath: "/health",
      }),
    );
    console.log("  OK");
  }

  if (!dryRun) {
    console.log(
      useDocker
        ? "Done. Render should start a new deploy; if not, open each service → Manual Deploy."
        : "Done. In the dashboard run Manual Deploy → Clear build cache & deploy (or push main).",
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
