# Consultant 09 — NotificationsEngagement (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/notifications`, `/settings/notifications` |
| **Key files** | `apps/web/components/notifications-panel.tsx`; `apps/web/app/(site)/settings/notifications/notifications-settings-form.tsx` |
| **API** | notifications.controller.ts |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-notify** | **Partial** | Inbox + prefs split (GN-012) |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-012** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Two surfaces same product name (broken_link)

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Unify wayfinding between bell page and settings prefs

## 8. Role coverage gaps

Guest: login required for /notifications.

---
*Phase 1 — no feature recommendations.*
