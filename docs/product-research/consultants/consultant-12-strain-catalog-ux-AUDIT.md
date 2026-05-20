# Consultant 12 — StrainCatalogUX (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/strains`, `/catalog/suggest` |
| **Key files** | `apps/web/app/(site)/strains/page.tsx`; `apps/api/src/catalog/public-strains.controller.ts` |
| **API** | GET /strains; GET /breeders; catalog suggestions |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-strain** | **Pass** | List + detail + reviews |
| **T-suggest** | **Pass** | Suggest → admin inbox |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- None primary in this charter

## 5. Platform unity gaps

- post strainId → strain page when set

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- strain detail reviews + breeder cross-links

## 8. Role coverage gaps

Guest browse; member suggest; staff review in /admin.

---
*Phase 1 — no feature recommendations.*
