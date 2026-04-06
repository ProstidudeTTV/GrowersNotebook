#!/usr/bin/env node
/**
 * One-shot: create a Synapse admin via shared-secret registration API, print access_token.
 * Requires homeserver.yaml to include registration_shared_secret (see patch_config.py +
 * SYNAPSE_REGISTRATION_SHARED_SECRET on the Synapse service).
 *
 * Usage:
 *   SYNAPSE_REGISTRATION_SHARED_SECRET=... node scripts/provision-synapse-admin.mjs
 *
 * Optional: SYNAPSE_URL, SYNAPSE_SERVER_NAME, SYNAPSE_ADMIN_LOCALPART
 */
import crypto from "node:crypto";
import https from "node:https";

const synapseUrl = (process.env.SYNAPSE_URL ?? "https://growers-synapse.onrender.com").replace(
  /\/+$/,
  "",
);
const serverName =
  process.env.SYNAPSE_SERVER_NAME ?? "growers-synapse.onrender.com";
const sharedSecret = process.env.SYNAPSE_REGISTRATION_SHARED_SECRET?.trim();
const localpart = (process.env.SYNAPSE_ADMIN_LOCALPART ?? "gn_synapse_admin").replace(
  /^@/,
  "",
);

if (!sharedSecret) {
  console.error("SYNAPSE_REGISTRATION_SHARED_SECRET is required.");
  process.exit(1);
}

function requestJson(method, path) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, synapseUrl);
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      headers: {
        Accept: "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (c) => {
        buf += c;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: buf, headers: res.headers });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, synapseUrl);
    const payload = JSON.stringify(body);
    const opts = {
      method: "POST",
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (c) => {
        buf += c;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: buf });
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function macRegister(shared, nonce, user, password, admin) {
  const h = crypto.createHmac("sha1", shared);
  h.update(nonce, "utf8");
  h.update(Buffer.from([0]));
  h.update(user, "utf8");
  h.update(Buffer.from([0]));
  h.update(password, "utf8");
  h.update(Buffer.from([0]));
  h.update(admin ? "admin" : "notadmin", "utf8");
  return h.digest("hex");
}

const password = crypto.randomBytes(24).toString("base64url");

const nonceRes = await requestJson("GET", "/_synapse/admin/v1/register");
if (nonceRes.status !== 200) {
  console.error(
    "GET register nonce failed:",
    nonceRes.status,
    nonceRes.body.slice(0, 400),
  );
  process.exit(1);
}
const { nonce } = JSON.parse(nonceRes.body);
const mac = macRegister(sharedSecret, nonce, localpart, password, true);

const regRes = await postJson("/_synapse/admin/v1/register", {
  nonce,
  username: localpart,
  displayname: "Growers Notebook (API)",
  password,
  admin: true,
  mac,
});

let regBody;
try {
  regBody = JSON.parse(regRes.body);
} catch {
  console.error("Invalid JSON from register:", regRes.status, regRes.body.slice(0, 500));
  process.exit(1);
}

if (regRes.status !== 200) {
  console.error("Register failed:", regRes.status, regBody);
  process.exit(1);
}

if (!regBody.access_token) {
  console.error("No access_token in response:", regBody);
  process.exit(1);
}

console.log(JSON.stringify({
  adminUserId: regBody.user_id ?? `@${localpart}:${serverName}`,
  accessToken: regBody.access_token,
  bootstrapPasswordNote:
    "Save password offline if needed; it is not printed. Re-run only on a fresh DB or use Synapse admin tools.",
}, null, 2));
