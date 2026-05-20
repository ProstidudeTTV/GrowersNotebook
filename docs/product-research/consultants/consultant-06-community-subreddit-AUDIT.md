# Consultant 06 — CommunitySubreddit (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/community`, `/community/[slug]` |
| **Key files** | `apps/web/app/(site)/community/[slug]/page.tsx`; `apps/web/app/(site)/community/communities-directory-client.tsx` |
| **API** | GET /communities; community posts list; moderators API |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-community** | **Partial** | Banner/sort/join OK; no mod bar (GN-010); triple composer |

## 3. Live audit notes

- Community page: inline composer + link to `/community/[slug]/new`.
- Moderators block is placeholder text, not API-driven list.

## 4. Bugs (GN-IDs)

- **GN-010** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Community mod API without public bar (UI_only)

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **4** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- community/[slug]/page.tsx — placeholder moderators copy
- Triple post entry: sidebar + inline + /new

## 8. Role coverage gaps

Guest: browse. Member: join/post. Community mod: no public tools.

---
*Phase 1 — no feature recommendations.*
