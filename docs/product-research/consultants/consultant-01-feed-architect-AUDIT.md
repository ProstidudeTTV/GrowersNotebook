# Consultant 01 — FeedArchitect (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/`, `/following`, `/hot` |
| **Key files** | `apps/web/app/(site)/page.tsx`; `apps/web/app/(site)/following/page.tsx`; `apps/web/app/(site)/hot/page.tsx`; `apps/web/components/feed-post-card.tsx`; `apps/web/lib/feed-post.ts` |
| **API** | GET /posts/following; GET /posts/hot/week|day|month; GET /posts/recent |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-feed** | **Partial** | Vote/report OK; hot day/month needs prod API (GN-001); iconKey fixed branch (GN-002) |
| **T-media** | **Partial** | Feed shows first image only (GN-009) |

## 3. Live audit notes

- `page.tsx` redirects authed users to `/following`; guest hero uses hot/week + recent APIs.
- `feed-post-card.tsx` line ~235: `media?.[0]` for hero — GN-009.
- `layout.tsx` sidebar hot fetch still `/posts/hot/week` only.

## 4. Bugs (GN-IDs)

- **GN-001** — see AUDIT-REGISTER for repro
- **GN-002** — see AUDIT-REGISTER for repro
- **GN-003** — see AUDIT-REGISTER for repro
- **GN-009** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Post `media[]` truncated in feed (UI_only)
- Sidebar hot list still week-only in layout fetch

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **4** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- feed-post-card.tsx — uses `local.media?.[0]`; ignores additional images
- hot/page.tsx — day/month require API deploy parity with web

## 8. Role coverage gaps

Guest: landing + hot/recent. Member: `/following` default after login. Vote uses loginHref (GN-003 fixed). Multi-image GN-009 affects all.

---
*Phase 1 — no feature recommendations.*
