# Build notes (agents & maintainers)

This document complements [`README.md`](../README.md) and [`ROADMAP.md`](../ROADMAP.md). It captures **how we build and ship** Growers Notebook and, in depth, **security scope** so future agents do not re-litigate product promises or break invariants.

---

## Stack (authoritative)

| Layer | Role |
|--------|------|
| **Next.js** (`apps/web`) | UI, Supabase browser client (auth session), [`/api/gn-proxy`](../apps/web/app/api/gn-proxy/) same-origin API proxy (Bearer to Nest, not cookies). |
| **NestJS** (`apps/api`) | Business logic, JWT verification, Drizzle → Postgres, audit logging, rate limits, media processing (ffmpeg in Docker). |
| **Postgres** (hosted via Supabase) | Source of truth for app data; Nest uses **`DATABASE_URL`** (privileged role, **bypasses RLS**). |
| **Supabase Auth** | Email/password (etc.); JWTs consumed by Nest. |
| **Supabase Storage** | `post-media`, `avatars`; uploads often **direct from browser** with RLS-scoped policies. |
| **Render** | Docker deploys for web + API (`render.yaml`, `Dockerfile.growers-*`). |

Infra secrets and auth URL rules: [`infra/render/SUPABASE_AUTH.md`](../infra/render/SUPABASE_AUTH.md). Database + MCP workflow: [`supabase-mcp-handbook.md`](supabase-mcp-handbook.md).

---

## Security scope (detailed)

### What “secure enough” means for this product

- We target **mainstream web app** security: **HTTPS**, **authenticated APIs**, **RLS** to block bulk scraping via the **public anon key**, **moderation** (ban/suspend), **audit** trails with **privacy-aware** IP handling, and **defense in depth** on the API (validation, allowlists, rate limits).
- We **do not** market **Signal-style end-to-end encryption** for DMs or posts. Message bodies and media metadata handling are **server-readable** where the architecture requires it (moderation, search, notifications). User-facing copy should stay honest (see [`apps/web/app/(site)/privacy/`](../apps/web/app/(site)/privacy/page.tsx)).

### Trust boundaries

1. **Browser → Next**: Session cookies for Supabase; same-origin API calls via **`gn-proxy`** with explicit **Bearer** tokens for Nest.
2. **Next → Nest**: JSON API; CORS on Nest is allowlisted via **`WEB_ORIGIN`** in production.
3. **Nest → Postgres**: Service logic; must **not** trust client-supplied user IDs for authorization—always **`JWT.sub`** (see guards).
4. **Client → Supabase Storage**: Authenticated uploads under `auth.uid()` path prefixes; URLs validated on the API where content is attached to posts/comments/DMs.
5. **Operators**: Anyone with **database**, **service role**, or **hosting** access can read stored content—do not promise otherwise in UX without architectural change.

### Authentication & authorization (API)

- **`SupabaseAuthGuard`**: Requires `Authorization: Bearer`; verifies JWT; ensures profile row; **`ProfilesService.enforceActiveAccountOrThrow`** (ban/suspend).
- **`OptionalAuthGuard`**: Same JWT path when Bearer present; **also enforces ban/suspend** when session is valid; invalid/expired token → anonymous (swallowed), except **`ForbiddenException`** is rethrown.
- **`RolesGuard`**: Admin/moderator routes check **`profiles.role`** in DB.
- **No global auth guard**: Each route declares guards explicitly—new endpoints must choose **Optional** vs **Required** auth deliberately.

### Data exposure (PostgREST vs Nest)

- **RLS** is tuned so **most** `public.*` tables are **not** readable/writable via PostgREST for `anon`/`authenticated`, while **Realtime** still works for **`comments`**, **`post_votes`**, **`comment_votes`** (broad `SELECT`—see triage doc).
- **`dm_messages`**: **Not** on Realtime publication; **no** permissive SELECT for JWT roles—DM plaintext is loaded **only via Nest**.
- **`dm_realtime_signals`**: **No message body**; Nest inserts after each DM; **SELECT** only for thread participants; **Realtime** used for **push-style** inbox updates. See handbook.

### Privacy consistency

- **`profiles.profile_public`**: Public listing/search and **direct `GET /posts/:id`** must respect the same visibility rules as profile-scoped feeds where applicable (implemented in **`PostsService`** / **`CommentsService`**—extend **`listFollowing`** or votes if product requires stricter rules later).

### Media & metadata

- **Images**: Client-side re-encode to JPEG for EXIF stripping where implemented.
- **Videos**: Browser uploads as-is; API may **remux** via **ffmpeg** (`POST /media/post-media/strip-video-metadata`) to drop common container metadata; requires **ffmpeg** in API image ([`Dockerfile.growers-api`](../Dockerfile.growers-api)).
- **URLs**: **`isAllowedPostMediaPublicUrl`** for post attachments, comments, DMs, strain reviews; **`isAllowedAvatarPublicUrl`** for profile avatars—**not** arbitrary HTTPS hosts.

### Abuse & cost controls

- **`@nestjs/throttler`**: Global limit + stricter limits on **search** endpoints; **`AppController`** (`/`, `/health`) is **`@SkipThrottle()`**.
- **Search**: Prefer consistent **`escapeIlikePattern`** (or equivalent) for user `ilike` input to avoid wildcard blow-ups.

### Error & health disclosure

- Production responses: **5xx `HttpException`** bodies sanitized in [`AllExceptionsFilter`](../apps/api/src/http-exception.filter.ts); **`/health`** and missing **`DATABASE_URL`** use **short codes** in production—avoid leaking file paths and internal setup strings to clients.

### Hosted Supabase “Security Advisor”

- **WARN** items often include: **public bucket listing** (`avatars`, `post-media`)—fix is usually **private bucket + signed URLs** (partially supported: **`POST /media/post-media/signed-url`**); **leaked password protection** is **Auth dashboard** only, not SQL.
- Re-run Advisor after **RLS/migration** changes; track in [`supabase-mcp-handbook.md`](supabase-mcp-handbook.md).

### Dependency & supply chain

- Run **`pnpm audit`** periodically; triage transitive issues (Nest/Next/Refine). Snapshot context: [`security-triage-2026-04-08.md`](security-triage-2026-04-08.md).

---

## Checklist for future changes (security-relevant)

When touching **auth, DMs, storage, RLS, Realtime, or uploads**:

1. **Migrations**: Keep **`supabase/migrations/`** and **`apps/api/drizzle/`** aligned; apply hosted DB via **`pnpm db:migrate`** and/or Supabase MCP **`apply_migration`**.
2. **RLS**: New `public` tables need explicit **deny** policies for PostgREST if they mirror the `gn_no_postgrest_*` pattern—**except** tables that intentionally allow Realtime/`SELECT` (document why).
3. **Guards**: Mutations = **`SupabaseAuthGuard`** unless intentionally public; document **Optional** reads that leak data.
4. **PII / logs**: Do not log raw tokens or full client IPs in application logs; audit interceptor redacts sensitive body keys (nested redaction is not exhaustive).
5. **CORS / `WEB_ORIGIN`**: Multi-host deployments need comma-separated origins on the API.
6. **Ship**: Substantive API/web/security changes → **commit + push to `main`** for Render auto-deploy (maintainer workflow).

---

## Related documents

| Doc | Contents |
|-----|----------|
| [`supabase-mcp-handbook.md`](supabase-mcp-handbook.md) | RLS, Realtime, MCP migrations, Advisor |
| [`security-triage-2026-04-08.md`](security-triage-2026-04-08.md) | Point-in-time triage + `pnpm audit` notes |
| [`infra/render/SUPABASE_AUTH.md`](../infra/render/SUPABASE_AUTH.md) | Auth URLs, redirects, DMs architecture note |

---

*Last expanded: 2026-04-19 (security scope for agent continuity).*
