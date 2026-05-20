# Consultant 14 — GuestVsMemberParity (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `top public routes` |
| **Key files** | `grep apps/web for login patterns` |
| **API** | OptionalAuthGuard |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-feed** | **Partial** | Guest vote next= fixed (GN-003) |
| **T-post** | **Pass** | Guest read + CTA |
| **T-comment** | **Partial** | Guest sign-in report |
| **T-msg** | **Fail** | Login required — expected |
| **T-nav** | **Partial** | Staff link branch only |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-003** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Honest empty states on guest landing

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Residual /login without loginHref audit

## 8. Role coverage gaps

Cross-cutting matrix in AUDIT-REGISTER §17-flow.

---
*Phase 1 — no feature recommendations.*
