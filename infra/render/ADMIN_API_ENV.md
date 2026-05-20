# Render API env (growers-notebook-api)

Admin community **image uploads** and some media jobs need the Supabase **service role** on the **API** service (not the web app).

## Required on `growers-notebook-api`

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase pooler |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secret) |
| `WEB_ORIGIN` | `https://growersnotebook.com` |

Without `SUPABASE_SERVICE_ROLE_KEY`, `POST /admin/communities/upload-image` returns **503** (`Storage is not configured`). The admin UI will fall back to browser uploads if your `profiles.role` is `admin` in Postgres.

## Optional on `growers-notebook-web`

| Variable | Purpose |
|----------|---------|
| `INTERNAL_API_URL` | Same as `NEXT_PUBLIC_API_URL`; used by `/api/gn-proxy` on the server |

After adding secrets: **Manual Deploy** or push to `main` on both services.
