# Growers Notebook — roadmap

Living checklist for major milestones. Update this when you ship a slice of the product.

## Done

### Milestone: Stack + vertical slice (baseline)

- Next.js (App Router) + Tailwind, NestJS API, PostgreSQL on Supabase, Drizzle migrations, Supabase Auth + Realtime (comments), Refine admin under `/admin`.
- **Data seed (demo content)** — **2026-04-05**
  - **Applied:** idempotent SQL in [`apps/api/drizzle/seed_data.sql`](apps/api/drizzle/seed_data.sql) (profiles, communities, posts, comments, sample votes).
  - **Re-run locally:** `pnpm db:seed` from repo root (requires `DATABASE_URL` in `apps/api/.env`).
  - **Demo UUIDs:** profiles/posts use fixed IDs (`f100…`, `f200…`, `f300…`, `f400…`) so re-runs do not duplicate. Those profiles are **not** Supabase Auth users; real users still get a row in `profiles` on first authenticated API call.
  - **Seeded communities (slugs):** `general`, `grow-journal`, `genetics`.
  - **Next ops:** promote a real user: `UPDATE public.profiles SET role = 'admin' WHERE id = '<auth.users.id>';` then browse `/admin`.

## Next (suggested order)

1. **RLS** — lock down `public.*` for direct Supabase client access; keep Nest as primary write path until policies are audited.
2. **Product identity** — replace placeholder branding, nav, and empty states with Growers Notebook–specific IA.
3. **Feed quality** — cursor pagination, “hot” ranking, soft deletes / moderation state from admin.
4. **Profiles UX** — public profile pages, avatars (Storage), edit display name.
5. **Notifications** — Realtime or queue for replies and mod actions.

## Conventions

- **Schema migrations:** owned by Drizzle under `apps/api` (`pnpm db:migrate`).
- **Content seed:** SQL file + `pnpm db:seed`; do not mix large seed data into Drizzle versioned migrations unless it is environment-specific and agreed.
