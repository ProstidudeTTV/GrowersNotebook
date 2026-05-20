# Consultant 18 — AdminCatalogStaff (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/admin/strains`, `/admin/catalog-suggestions` |
| **Key files** | `apps/web/app/admin/admin-refine-resources.tsx` |
| **API** | admin-catalog.controller.ts |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-admin** | **Pass** | Catalog admin |
| **T-suggest** | **Pass** | Inbox path |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- None primary in this charter

## 5. Platform unity gaps

- Member suggest → admin inbox

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **1** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Moderator strain edit vs admin create policy copy

## 8. Role coverage gaps

Admin create; moderator review.

---
*Phase 1 — no feature recommendations.*
