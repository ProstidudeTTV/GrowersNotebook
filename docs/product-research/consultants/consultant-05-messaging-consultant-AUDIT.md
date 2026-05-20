# Consultant 05 — MessagingConsultant (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/messages` |
| **Key files** | `apps/web/app/(site)/messages/page.tsx`; `apps/web/components/messages-panel.tsx` |
| **API** | direct-messages.controller.ts |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-msg** | **Partial** | Threads + composer; scroll chain sensitive |
| **T-gif** | **Partial** | Trending + offset in messages-panel branch (GN-004) |
| **T-emoji** | **Pass** | Emoji in DM composer |

## 3. Live audit notes

- `messages/page.tsx` redirects guests to `/login?next=/messages`.
- `messages-panel.tsx` uses `fetchGiphyTrendingItems` with offset ref for load-more.

## 4. Bugs (GN-IDs)

- **GN-004** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Shared giphy-search route with comments

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- messages-panel.tsx — monolithic client; flex min-h-0 for composer

## 8. Role coverage gaps

Guest: login redirect. Member: threads + GIF trending/offset in branch.

---
*Phase 1 — no feature recommendations.*
