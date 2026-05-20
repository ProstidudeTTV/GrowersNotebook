# Consultant 25 — CompetitorBenchmarkLead (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `program synthesis` |
| **Key files** | `25 consultant AUDIT files`; `AUDIT-REGISTER.md` |
| **API** | n/a |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-feed** | **Partial** | GN-001, GN-002, GN-003, GN-009 |
| **T-post** | **Partial** | GN-009, GN-011 |
| **T-comment** | **Partial** | GN-007, GN-004 |
| **T-community** | **Partial** | GN-010 |
| **T-profile** | **Pass** | — |
| **T-msg** | **Partial** | GN-004 |
| **T-search** | **Partial** | GN-008, GN-005 |
| **T-media** | **Partial** | GN-009 |
| **T-staff-public** | **Fail** | GN-006 partial; no mod bar |

## 3. Live audit notes

- Rolls up 24 audits; dual FB/RD scores in AUDIT-REGISTER.
- Lowest areas: comments 2/2, search 2/2, staff-public Fail.

## 4. Bugs (GN-IDs)

- **GN-001** — see AUDIT-REGISTER for repro
- **GN-002** — see AUDIT-REGISTER for repro
- **GN-003** — see AUDIT-REGISTER for repro
- **GN-004** — see AUDIT-REGISTER for repro
- **GN-005** — see AUDIT-REGISTER for repro
- **GN-006** — see AUDIT-REGISTER for repro
- **GN-007** — see AUDIT-REGISTER for repro
- **GN-008** — see AUDIT-REGISTER for repro
- **GN-009** — see AUDIT-REGISTER for repro
- **GN-010** — see AUDIT-REGISTER for repro
- **GN-011** — see AUDIT-REGISTER for repro
- **GN-012** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Lowest scores: comments 2/2, search 2/2, staff-public Fail

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **2** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **2** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- Merge media rewrite targets from #03 and #21
- Flow scorecard: AUDIT-REGISTER FB/RD table

## 8. Role coverage gaps

Program-level parity scorecard owner.

---
*Phase 1 — no feature recommendations.*
