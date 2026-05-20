# Consultant 16 — AdminDashboardStats (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/admin` |
| **Key files** | `apps/web/app/admin/page.tsx` |
| **API** | moderation-stats; platform-stats |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-admin** | **Pass** | Live stat cards from API |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-006** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Counts from API not invented

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Public Staff link + queue badge (branch)

## 8. Role coverage gaps

Admin all cards; moderator trimmed dashboard.

---
*Phase 1 — no feature recommendations.*
