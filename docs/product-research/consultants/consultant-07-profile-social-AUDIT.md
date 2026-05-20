# Consultant 07 — ProfileSocial (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/u/[userId]`, `/settings/profile` |
| **Key files** | `apps/web/app/(site)/u/[userId]/profile-view.tsx`; `apps/web/app/(site)/settings/profile/profile-settings-form.tsx` |
| **API** | GET /profiles/:id; PATCH /profiles/me; follows; blocks |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-profile** | **Pass** | Tabs, follow, block, report, settings edit |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- None primary in this charter

## 5. Platform unity gaps

- Profile ↔ posts/notebooks tabs wired

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- profile-view — no cover/banner/pinned post
- Media tab density vs Pinterest-style grid target

## 8. Role coverage gaps

Guest: public read. Member: follow/block/report/edit settings.

---
*Phase 1 — no feature recommendations.*
