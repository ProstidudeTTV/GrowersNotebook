# Consultant 02 — PostComposerStrategist (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/new-post`, `/following`, `/community/[slug]/new` |
| **Key files** | `apps/web/components/feed-post-composer.tsx`; `apps/web/components/post-composer.tsx`; `apps/web/app/(site)/new-post/page.tsx`; `apps/web/lib/post-composer-draft-storage.ts` |
| **API** | POST /posts; POST /media/upload |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-post** | **Pass** | All three publish paths call POST /posts |
| **T-text** | **Pass** | Title/body validation in post-composer |
| **T-media** | **Partial** | Multi-upload works; feed still first-only (GN-009) |

## 3. Live audit notes

- `feed-post-composer.tsx` uses `login-return-path` for sign-in redirect.
- `post-composer-draft-storage.ts` has no imports in apps/web — GN-011.
- Community `new/post-form.tsx` server-gated post-recovery.

## 4. Bugs (GN-IDs)

- **GN-011** — see AUDIT-REGISTER for repro
- **GN-009** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Draft storage dead (UI_only)
- All paths POST /posts with communityId optional

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- post-composer-draft-storage.ts — exported save/load never imported
- Three entry paths (sidebar, inline, community new) — document-only clarity gap

## 8. Role coverage gaps

Guest: sign-in from feed composer. Member: publish from all three paths. GN-011 draft unused.

---
*Phase 1 — no feature recommendations.*
