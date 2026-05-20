# Consultant 03 — PostDetailGrowDiaries (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/p/[id]` |
| **Key files** | `apps/web/app/(site)/p/[id]/post-view.tsx`; `apps/web/components/post-media-carousel.tsx` |
| **API** | GET/PATCH/DELETE /posts/:id; POST report |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-post** | **Pass** | Detail vote, edit, report, share |
| **T-media** | **Partial** | Carousel on detail; not grid/lightbox (GN-009) |

## 3. Live audit notes

- `post-view.tsx` embeds `PostMediaCarousel` for all `media[]` items.
- Owner edit/delete and report actions present on detail.

## 4. Bugs (GN-IDs)

- **GN-009** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- Detail shows full media; feed card does not (broken_link)

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- post-media-carousel.tsx — single-slide arrows vs grid/lightbox target
- post-view.tsx — tall hero present; no thumb strip

## 8. Role coverage gaps

Guest: read + report CTA. Owner: edit/delete. No staff mod strip on page.

---
*Phase 1 — no feature recommendations.*
