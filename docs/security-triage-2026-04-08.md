# Security triage (2026-04-08)

Consolidated notes from ten readonly exploration passes after shipping privacy/RLS work. Not a penetration test.

## P0 / follow-up

- **PostgREST `comments` / vote tables:** `anon` + `authenticated` have `SELECT USING (true)` so **Realtime** works for guests. Anyone with the public anon key can still **read** those tables via the Data API (same class of exposure as pre-RLS). Tightening would require product changes (e.g. auth-gated Realtime only).

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
