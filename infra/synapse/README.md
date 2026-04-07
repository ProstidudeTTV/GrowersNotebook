# Synapse (Matrix) — local Docker

PostgreSQL and Synapse for development. Production can use Render Postgres from `render.yaml` (`growers-matrix-postgres`) and a Synapse deployment that points at that database.

## First-time setup

1. Generate `homeserver.yaml` into the `synapse-app-data` volume:

   ```bash
   docker compose -f infra/synapse/docker-compose.yml run --rm synapse generate
   ```

2. Edit the generated `/data/homeserver.yaml` inside the volume (or mount a file) so the database matches this compose file:

   - `database`: Postgres with host `synapse-db`, user `synapse`, password `synapse_local_dev`, database `synapse`, port 5432.

3. Enable JWT login (Nest mints tokens with `SYNAPSE_JWT_SECRET`):

   ```yaml
   jwt_config:
     enabled: true
     secret: "same-value-as-SYNAPSE_JWT_SECRET-in-Nest-env"
     algorithm: "HS256"
   ```

4. Disable federation for a private instance (optional):

   ```yaml
   federation_domain_whitelist: []
   ```

5. Start services:

   ```bash
   docker compose -f infra/synapse/docker-compose.yml up -d
   ```

6. Create an admin Matrix user (via `docker exec` + `register_new_matrix_user` or Element against `http://127.0.0.1:8010`), then copy a login **access token** for the Nest env variable `SYNAPSE_ADMIN_ACCESS_TOKEN`.

## Nest / web environment

See root [`env.example`](../../env.example) for `SYNAPSE_*` variables. Browser clients use `SYNAPSE_PUBLIC_BASE_URL` when it differs from the API’s internal `SYNAPSE_BASE_URL`.
