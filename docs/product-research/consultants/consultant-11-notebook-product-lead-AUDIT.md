# Consultant 11 — NotebookProductLead (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/notebooks`, `/notebooks/[id]` |
| **Key files** | `apps/web/components/notebooks/notebook-setup-wizard.tsx`; `apps/web/components/notebook-detail-client.tsx` |
| **API** | notebooks.controller.ts |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-nb-wiz** | **Partial** | F/C and gal/L present; long wizard |
| **T-nb-week** | **Partial** | Week metrics + media; spacing dense on mobile |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- None primary in this charter

## 5. Platform unity gaps

- Notebook not in unified search (GN-008)

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **1** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- notebook-setup-wizard — unit pills F/C, gal/L
- Week editor spacing and carousel for week media

## 8. Role coverage gaps

Member: full wizard. Guest: limited public notebook views.

---
*Phase 1 — no feature recommendations.*
