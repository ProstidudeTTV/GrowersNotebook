# Consultant 04 — CommentThreadDesigner (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/p/[id]#comments` |
| **Key files** | `apps/web/components/comment-thread.tsx`; `apps/web/components/comment-discussion-composer.tsx`; `apps/web/app/api/giphy-search/route.ts` |
| **API** | POST comments; POST comment votes; POST report |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-comment** | **Partial** | Reply depth 0 UI (GN-007); report visible |
| **T-gif** | **Partial** | Trending on open branch; no load-more in comment picker (GN-004) |
| **T-emoji** | **Pass** | Full emoji picker in composer |

## 3. Live audit notes

- `comment-thread.tsx` `canReply = depth === 0 && viewerId` — GN-007.
- `comments.service.ts` rejects reply when parent already has parentId.
- Giphy route merges trending + search up to 56 items when key set.

## 4. Bugs (GN-IDs)

- **GN-007** — see AUDIT-REGISTER for repro
- **GN-004** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- API nested parentId; UI one reply level

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- comment-thread.tsx — `canReply = depth === 0` limits tree
- comment-discussion-composer — trending without load-more vs messages-panel

## 8. Role coverage gaps

Guest: sign-in to report. Member: reply at depth 0 only (GN-007).

---
*Phase 1 — no feature recommendations.*
