# Security triage (2026-04-08)

Consolidated notes from ten readonly exploration passes after shipping privacy/RLS work. Not a penetration test.

## P0 / follow-up

- **PostgREST `comments` / vote tables:** `anon` + `authenticated` have `SELECT USING (true)` so **Realtime** works for guests. Anyone with the public anon key can still **read** those tables via the Data API (same class of exposure as pre-RLS). Tightening would require product changes (e.g. auth-gated Realtime only).

## 2026-05-26 hardening update

- **Realtime tightened:** `comments`, `post_votes`, and `comment_votes` now expose Realtime `SELECT` to `authenticated` only. Guests still load comments through the Nest API, but they no longer get live PostgREST-backed updates.
- **RPC hardened:** `sync_post_vote_counts()` is no longer executable by `anon` / `authenticated`, closing the Security Advisor warning on that trigger helper.
- **Storage listing closed:** broad `storage.objects` `SELECT` policies were removed from the public `avatars`, `post-media`, and `community-banners` buckets. Public object URLs still work; bucket enumeration does not.
- **Route abuse controls:** the public Next.js API proxy now rate-limits requests and no longer forwards `/admin/*`; staff traffic uses a dedicated `/api/gn-admin/*` proxy. Password reset and Giphy routes now have explicit rate limits.
- **Profile/settings path fixed:** notification preferences now round-trip through `PATCH /profiles/me`, and self-service display-name updates use the same blocklist enforcement as admin edits.
- **Defense in depth:** web responses now ship baseline security headers, JSON-LD escapes `<`/`>`/`&`, rendered post HTML is re-sanitized on read, community image URLs are restricted to the project’s Supabase storage origin, admin patch routes use validated DTOs, and production API requests now require an `Origin` header outside `/health`.
- **Observability/IR:** Sentry bootstrap files were added for web and API, `render.yaml` and `env.example` now include Sentry env hooks, `gitleaks` runs in CI, and `docs/incident-response.md` captures the first-response playbook.

## Positive findings

- **RLS:** Core `public` tables now deny PostgREST by default; Nest uses privileged `DATABASE_URL` and bypasses RLS. **`dm_messages`** remains off Realtime with **no SELECT policy** (PostgREST cannot read plaintext DMs). Storage policies still scope writes to `auth.uid()` path prefix.
- **API guards:** Mutating routes use `SupabaseAuthGuard`; public catalog mutating methods are guarded per-method.
- **IDOR (sample):** Post/comment `updateOwn` / `deleteOwn` and votes bind to JWT user; notebook vote checks readability.
- **SQL:** Drizzle `sql` fragments are parameterized; no request-time `sql.raw` in `src`.
- **Auth callback:** `safeInternalPath` blocks open redirects; CORS in production uses `WEB_ORIGIN` allowlist.
- **Admin:** `/admin` gated in `app/admin/layout.tsx` (staff role via API).
- **Secrets:** `render.yaml` uses `sync: false` for sensitive keys; no service role in web bundle.

## Medium / hygiene

- **Stored HTML:** Post `bodyHtml` is passed through **`sanitizePostHtml`** on the API before persist; display path uses `dangerouslySetInnerHTML` after YouTube expansion—keep server sanitizer aligned with TipTap/DOMPurify allowlists.
- **CORS dev:** `origin: true` in non-production is permissive (expected for local dev).
- **Audit IPs:** Now truncated in `audit_events.ip` for mutating requests.

## Ops

- Apply **`supabase/migrations/20260519120000_rls_hardening_public_core.sql`** (or `pnpm db:migrate` with Drizzle **`0031`**) to production, then re-run **Supabase Security Advisor**.
- Periodic: `pnpm audit`, search-engine dorking on the live domain per internal privacy plan.

## `pnpm audit` snapshot (2026-04-08)

High-severity items reported (mostly transitive): `glob` (Nest CLI), `multer` (Nest platform-express), `picomatch`, `path-to-regexp` (Refine/antd), `lodash` (@nestjs/config), `next` (patch available ≥15.5.15). Track upgrades on Nest/Next/Refine bumps; not all are runtime-exposed on production.

## `pnpm audit --prod` refresh (2026-05-26)

- **55 advisories total:** 19 high, 31 moderate, 5 low.
- **Highest-value production follow-ups still open:**
  - `next@15.5.14` should be bumped to at least `15.5.16` (current audit reports both high and low Next.js advisories).
  - `multer@2.0.2` remains in the Nest upload stack through `@nestjs/platform-express`; audit wants `>=2.1.1`.
  - `path-to-regexp@8.2.0` is pulled in via Refine/Ant Design admin dependencies; patched in `>=8.4.0`.
  - `lodash@4.17.23` is pulled in by `@nestjs/config`; patched in `>=4.18.0`.
- These are dependency-upgrade tasks, not new code-level regressions from the hardening work above.
