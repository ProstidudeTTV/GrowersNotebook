# Supabase MCP & database domain handbook

This file is the **project-wide source of truth** for agents using **Supabase MCP** (`user-supabase`, `plugin-supabase-supabase`) alongside the Nest API. **Update it whenever** `apps/api/src/db/schema.ts`, Drizzle migrations, `supabase/migrations/`, or follow-related API behavior changes.

## MCP tools (Supabase)

| Tool | Use when |
|------|----------|
| `apply_migration` | Applying DDL to the **linked Supabase project**. Pass `name` (snake_case) + `query` (full SQL). Prefer content from `supabase/migrations/*.sql` or idempotent Drizzle SQL. |
| `execute_sql` | DML, one-off checks, `SELECT` — not for destructive DDL unless intentional. |
| `list_tables` | Inspect live schema vs repo. |
| `list_migrations` | See what Supabase has recorded. |
| `generate_typescript_types` | Regenerate client types after schema changes. |

**Insforge MCP** (if enabled): `run-raw-sql`, `get-table-schema` — same database; keep behavior aligned with this doc.

## Two migration paths (same Postgres)

1. **Drizzle (primary for Nest):** `apps/api/drizzle/*.sql` — run `pnpm db:migrate` from repo root; `DATABASE_URL` must point at this Supabase DB.
2. **Supabase folder / MCP:** `supabase/migrations/*.sql` — `supabase db push`, SQL Editor, or MCP **`apply_migration`**.

**Journal schema:** `drizzle.config.ts` sets `migrations.schema` to **`public`** so `__drizzle_migrations` matches older DBs. Drizzle Kit’s default is schema **`drizzle`**; if the journal is empty there, `migrate` replays **`0000_initial`**, hits “table already exists”, and every later migration (including follows) never runs.

Files should stay **equivalent** for new features. Prefer **idempotent** SQL (`IF NOT EXISTS`, guarded `DO $migrate$` blocks) so order of application does not break.

## Realtime (publication)

Migrations under `supabase/migrations/` enable replication for:

- `public.comments`
- `public.post_votes`
- `public.comment_votes` (requires `post_id` column for filter `post_id=eq.<uuid>`)

**Not** on `user_follows` / `community_follows` unless you add a new migration to `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.

## Row Level Security (PostgREST / anon key)

Migration **`20260519120000_rls_hardening_public_core.sql`** (and matching Drizzle **`0031_rls_hardening_public_core.sql`**) enables **RLS** on core `public` tables.

- **`comments`**, **`post_votes`**, **`comment_votes`**: `SELECT` for roles **`anon`** and **`authenticated`** so **Supabase Realtime** `postgres_changes` keeps working for live threads (including guests). This matches prior openness for those tables via PostgREST; narrowing further would require product changes (e.g. no guest realtime).
- **All other tables** in that migration: **no** `anon`/`authenticated` policies → **denied** through PostgREST (Supabase Data API), closing bulk scrape with the public anon key.
- **Nest** uses **`DATABASE_URL`** with a **privileged** Postgres role (table owner pattern) and **bypasses RLS** for application logic.
- **`user_notifications`**: existing `user_notifications_select_own` policy unchanged.
- **`dm_*`**, **`user_blocks`**: earlier migrations unchanged; **`dm_messages`** remains off the Realtime publication (read lockdown).

Migration **`20260520120000_rls_explicit_postgrest_deny.sql`** adds explicit **`USING (false)`** policies for **`anon` / `authenticated`** on backend-only tables (and on **`public.__drizzle_migrations`**) so the Supabase linter stops reporting **“RLS Enabled No Policy”** (INFO) without changing access: Nest still bypasses RLS. If this was applied via Supabase MCP in two steps, **`list_migrations`** may show **`rls_explicit_postgrest_deny_part1`** and **`_part2`** instead of one name—the SQL is equivalent to the single file in the repo.

### Security Advisor items that stay as dashboard / product choices

- **[Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)** (WARN): enable in **Supabase Dashboard → Authentication** (HaveIBeenPwned check for signups/password changes). Not configurable via SQL migration.
- **Public storage bucket listing** ([lint 0025](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing)) on **`avatars`** / **`post-media`**: broad **`SELECT`** on `storage.objects` is what allows **public `<img>` / video URLs** for arbitrary paths; narrowing policy typically means **private buckets + signed URLs** (app change). Accept the WARN or plan that migration separately.

## Tables (public schema)

Canonical definitions: `apps/api/src/db/schema.ts`.

| Table | Purpose |
|-------|---------|
| `profiles` | `id` = `auth.users.id`; `display_name`, `avatar_url`, `profile_public` (default true), `show_grower_stats_public` (default true), `show_notebooks_public` (default true), `role` enum (`member` / `moderator` / `admin`). |
| `communities` | `slug`, `name`, `description`. |
| `posts` | `community_id` (**nullable**: null = profile post), `author_id`, `title`, `body_json`, `body_html`, `excerpt`, timestamps. |
| `comments` | Threaded: `post_id`, `author_id`, `parent_id`, `body`. |
| `post_votes` | PK (`user_id`, `post_id`); `value` ±1. |
| `comment_votes` | PK (`user_id`, `comment_id`); **`post_id`** denormalized for Realtime filters. |
| `comment_reports` | Moderation; unique (`comment_id`, `reporter_id`). |
| `user_follows` | PK (`follower_id`, `following_id`); CHECK no self-follow. |
| `community_follows` | PK (`user_id`, `community_id`); “joined” community. |
| `notebooks` | NOTEBOOK grow diary: `owner_id`, optional `strain_id`, `custom_strain_label`, `title`, `status` (`active` / `completed` / `archived`), harvest fields, derived `g_per_watt` / `g_per_watt_per_plant`. |
| `notebook_weeks` | Weekly log: env readings, `image_urls` (max 8 via API), unique (`notebook_id`, `week_index`). |
| `nutrient_products` | Admin-curated product catalog; `notebook_week_nutrients` links rows to a week. |
| `notebook_votes` | PK (`user_id`, `notebook_id`); `value` ±1. |
| `notebook_comments` | Threaded comments on a notebook (`parent_id`). |
| `strains` | Catalog cultivars: `chemotype` (`indica` / `sativa` / `hybrid`, nullable), `genetics` (short lineage text, nullable), plus `effects`, `effects_notes`, `description`, breeder link, ratings. |

## Domain logic (API mental model)

- **Auth:** JWT from Supabase; Nest `ProfilesService.ensureProfile` on optional/auth routes.
- **Votes:** `POST /votes/post`, `POST /votes/comment`; tallies drive “seeds” / grower level.
- **Follows:** `POST|DELETE /follows/users/:userId`, `POST|DELETE /follows/communities/:communityId`.
- **Feeds:**  
  - `GET /posts?communityId=&sort=&page=` — per community.  
  - `GET /posts/following?sort=&page=` — posts where **author** is followed **or** **community** is joined; `community` on items is **null** for profile posts.  
  - `GET /posts/hot/week?page=&pageSize=` — hot **feed**: posts from the **last 7 days** (rolling), ordered by net vote score (then newest). Same item shape as community/following feeds (`items`, `total`, `page`, `pageSize`). Public (optional Bearer).  
  - `GET /profiles/:id`, `GET /profiles/:id/posts`, `GET /profiles/:id/comments` — public profile + tabs (optional Bearer for `viewerFollowing` on profile). If `profile_public` is false and the viewer is not the owner: `GET /profiles/:id` returns the profile card fields plus `profileFeedHiddenFromViewer: true`; `GET /profiles/:id/posts` and `GET /profiles/:id/comments` are empty. The owner always sees full lists. When `show_grower_stats_public` is false (public profile), `seeds` and `growerLevel` are null for non-owners.  
  - `GET /profiles/me`, `PATCH /profiles/me` — authenticated profile (edit display name, `avatar_url` HTTPS URL, privacy flags including `showNotebooksPublic`).  
  - **Notebooks:** `GET /notebooks`, `GET /notebooks/:id`, profile notebooks tab, votes, comments — see Nest `notebooks` module (public listings respect `show_notebooks_public` and `profile_public`).  
  - `POST /posts` — `communityId` optional (omit for profile post).  
- **Communities list/detail:** `viewerFollowing` on `GET /communities`, `GET /communities/:slug` when Bearer present.
- **Posts detail/list:** `author.viewerFollowing` when Bearer present.

## Web routes (reference)

- `/following` — personal feed (following + joined communities).
- `/u/[userId]` — public profile (posts + comments tabs). `/settings/profile` — edit name, avatar URL, privacy.
- `/community/[slug]` — community; **Join** / **Joined** maps to `community_follows`.
- Post author **Follow** / **Following** maps to `user_follows`.
- **`/hot`** — full hot-week feed; sidebar link + preview use `GET /posts/hot/week?page=1&pageSize=1` for the #1 line.

## Checklist for new tables or columns

1. Edit **`apps/api/src/db/schema.ts`**.
2. Run **`pnpm db:generate`** in `apps/api` (or author SQL by hand).
3. Add matching **`supabase/migrations/YYYYMMDDHHMMSS_description.sql`** (idempotent where possible).
4. Apply to hosted DB: **`pnpm db:migrate`** and/or Supabase MCP **`apply_migration`** with the same SQL.
5. **Update this file** (table list + any Realtime / domain notes).
6. If the web app queries new fields, update types and UI.

## Env

See repo `env.example` and `apps/api/.env.example` for `DATABASE_URL`, JWT secret, and Supabase URL/key alignment.
