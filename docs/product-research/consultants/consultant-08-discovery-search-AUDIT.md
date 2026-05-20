# Consultant 08 — DiscoverySearch (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/search` |
| **Key files** | `apps/web/app/(site)/search/page.tsx` |
| **API** | GET /profiles/search; GET /posts/search; GET /strains?q= |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-search** | **Partial** | Growers/posts/strains work; notebooks stub (GN-008) |

## 3. Live audit notes

- `search/page.tsx` L254–264: notebooks tab shows honest stub copy.
- Grower rows use View profile label (GN-005 fixed).

## 4. Bugs (GN-IDs)

- **GN-005** — see AUDIT-REGISTER for repro
- **GN-008** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- No notebook search endpoint (API_only)

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- search/page.tsx — notebooks tab honest stub

## 8. Role coverage gaps

Guest/member: search; GN-005 label fixed to View profile.

---
*Phase 1 — no feature recommendations.*
