# Consultant 22 — PlatformUnityAuditor (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `cross-entity` |
| **Key files** | `supabase/migrations`; `apps/api/src` |
| **API** | all public controllers |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-search** | **Partial** | GN-008 |
| **T-feed** | **Partial** | GN-009 |
| **T-msg** | **Partial** | GN-004 |
| **T-nb-wiz** | **Partial** | Silo from feed |

## 3. Live audit notes

- Owns AUDIT-REGISTER Platform Unity Map and cross-link test list.
- Scale: `20260526120000_posts_vote_counts_feed_indexes.sql` for feed queries.

## 4. Bugs (GN-IDs)

- **GN-008** — see AUDIT-REGISTER for repro
- **GN-010** — see AUDIT-REGISTER for repro
- **GN-012** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Owner of DB_only / API_only / UI_only / broken_link

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Maintain AUDIT-REGISTER Platform Unity Map

## 8. Role coverage gaps

Graph completeness guest→admin.

---
*Phase 1 — no feature recommendations.*
