# Consultant 15 — ModerationOps (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/admin/moderation`, `/admin/*-reports` |
| **Key files** | `apps/web/app/admin/moderation/page.tsx`; `apps/api/src/admin/admin.controller.ts` |
| **API** | remove post; dismiss reports; moderation-stats |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-admin** | **Pass** | Hub + lists + remove post |
| **T-staff-public** | **Fail** | No in-context mod (GN-010) |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-010** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Staff actions admin-only

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **1** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- In-context mod strip absent on public post/community

## 8. Role coverage gaps

Moderator subset; admin full; community mod no UI.

---
*Phase 1 — no feature recommendations.*
