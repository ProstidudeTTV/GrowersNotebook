# Synapse on Render

Docker image used by the `growers-synapse` web service in [`render.yaml`](../../../render.yaml). It:

1. Runs `generate` on first boot (empty `/data/homeserver.yaml`).
2. Patches config for **Render Postgres** (`DATABASE_URL`), **JWT login** (`SYNAPSE_JWT_SECRET`), **`public_baseurl`**, **listener on `PORT`**, and **disabled federation** (`federation_domain_whitelist: []`).

## Required service env (Render)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | From Render Postgres (`growers-synapse-db`), via blueprint `fromDatabase`. |
| `SYNAPSE_SERVER_NAME` | Matrix server name, usually your public host without scheme, e.g. `growers-synapse.onrender.com`. |
| `SYNAPSE_PUBLIC_BASE_URL` | `https://` + same host, **no** trailing slash in env (script adds `/`). |
| `SYNAPSE_JWT_SECRET` | Long random string; **must match** `SYNAPSE_JWT_SECRET` on the Nest API. |
| `SYNAPSE_REPORT_STATS` | `no` (set in blueprint). |

If your Render service URL differs from `https://growers-synapse.onrender.com`, set `SYNAPSE_SERVER_NAME` and `SYNAPSE_PUBLIC_BASE_URL` to match the real hostname.

## Nest API env (same workspace)

On **`growers-notebook-api`**, set:

- `SYNAPSE_BASE_URL` — typically `https://growers-synapse.onrender.com` (Synapse HTTP URL the API can reach).
- `SYNAPSE_PUBLIC_BASE_URL` — same as browser-facing URL (often identical).
- `SYNAPSE_SERVER_NAME` — same value as on the Synapse service.
- `SYNAPSE_JWT_SECRET` — **same** as Synapse.
- `SYNAPSE_ADMIN_ACCESS_TOKEN` — access token for a Synapse **admin** user (see below).
- `MATRIX_SSSS_WRAP_KEY` — **64 hex chars** (32-byte AES key) so the API can wrap Matrix secret-storage keys per profile for **new browsers/devices** reading DM history. See **`infra/render/SUPABASE_AUTH.md`** §2 and `apps/api/.env.example`.

Until the Synapse five are set, `POST /matrix/login-token` returns **503**. Until `MATRIX_SSSS_WRAP_KEY` is set, cross-device secret-storage sync endpoints return **503**.

## Admin token for `SYNAPSE_ADMIN_ACCESS_TOKEN`

After Synapse is healthy (`GET /_matrix/client/versions` returns JSON):

1. Temporarily set `registration_shared_secret` in `/data/homeserver.yaml` (Render **Shell** or disk editor), restart, then run `register_new_matrix_user` per [Synapse Docker README](https://github.com/element-hq/synapse/blob/develop/docker/README.md), **or** use Element Web pointed at your homeserver to register an admin-capable user.
2. Obtain a user **access token** for that admin (Element → Help → About, or login API).
3. Set `SYNAPSE_ADMIN_ACCESS_TOKEN` on the API service to that token.
4. Remove `registration_shared_secret` if you no longer need open registration.

## Health check

Render should use `/_matrix/client/versions` as the HTTP health check path.

## Local testing

Build and run with `/data` volume and the same env vars as Render; `DATABASE_URL` can point at any Postgres where Synapse has an empty database.
