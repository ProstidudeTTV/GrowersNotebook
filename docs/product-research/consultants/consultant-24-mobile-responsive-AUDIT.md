# Consultant 24 — MobileResponsive (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `messages`, `feed`, `post` |
| **Key files** | `messages-panel.tsx`; `site-chrome.tsx`; `feed-post-card.tsx` |
| **API** |  |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-feed** | **Partial** | Card width OK; vote rail touch OK |
| **T-msg** | **Partial** | Composer clip risk |
| **T-comment** | **Pass** | Portaled menus |
| **T-nav** | **Partial** | Mobile drawer |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-004** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- overflow-x-clip removed in site-chrome

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- messages min-h-0 flex chain
- comment menu portal

## 8. Role coverage gaps

Same functional gaps as desktop on mobile.

---
*Phase 1 — no feature recommendations.*
