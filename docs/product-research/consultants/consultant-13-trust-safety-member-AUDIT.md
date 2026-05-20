# Consultant 13 — TrustSafetyMember (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `feed`, `post`, `profile`, `comments` |
| **Key files** | `feed-post-card.tsx`; `post-view.tsx`; `comment-thread.tsx`; `profile-view.tsx` |
| **API** | report endpoints; admin *-reports |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-feed** | **Pass** | Report on card post-recovery |
| **T-post** | **Pass** | Report post |
| **T-comment** | **Pass** | Visible report |
| **T-profile** | **Pass** | Report profile |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- None primary in this charter

## 5. Platform unity gaps

- Reports reach moderation hub; notebook report missing

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Standardize report affordance placement

## 8. Role coverage gaps

Guest sign-in CTAs; member submit; staff only in /admin.

---
*Phase 1 — no feature recommendations.*
