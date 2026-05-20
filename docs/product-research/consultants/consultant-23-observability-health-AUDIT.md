# Consultant 23 — ObservabilityHealth (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/admin/health` |
| **Key files** | `apps/web/app/admin/health/page.tsx`; `health-client.tsx` |
| **API** | health probes |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-admin** | **Pass** | Health page role-aware; Giphy env partial |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-004** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- gn-proxy + API URL env visibility

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **1** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Surface GIPHY_API_KEY in health matrix

## 8. Role coverage gaps

Admin all checks; moderator N/A rows.

---
*Phase 1 — no feature recommendations.*
