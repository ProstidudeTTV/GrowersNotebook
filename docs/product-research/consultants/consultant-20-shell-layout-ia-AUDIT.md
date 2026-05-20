# Consultant 20 — ShellLayoutIA (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `all (site)` |
| **Key files** | `site-chrome.tsx`; `app-sidebar.tsx`; `(site)/layout.tsx` |
| **API** | sidebar hot/week fetch |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-nav** | **Partial** | Nav complete; Staff link branch (GN-006) |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-006** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Single nav grammar

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **4** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- site-chrome overflow-x-auto
- Staff sidebar link for admin|moderator

## 8. Role coverage gaps

Staff see Staff item when role set.

---
*Phase 1 — no feature recommendations.*
