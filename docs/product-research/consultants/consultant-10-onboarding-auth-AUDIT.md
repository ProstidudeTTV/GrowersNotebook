# Consultant 10 — OnboardingAuth (Phase 1 AUDIT)

**Date:** 2026-05-20 | **Phase:** 1 Audit only — no recommendations, no MoSCoW.

## 1. Inventory

| Layer | Detail |
|-------|--------|
| **Routes** | `/login`, `/welcome`, `/settings` |
| **Key files** | `apps/web/app/(site)/login/login-form.tsx`; `apps/web/lib/login-return-path.ts`; `apps/web/components/auth-provider.tsx`; `apps/web/app/(site)/layout.tsx` |
| **API** | Supabase auth; GET /profiles/me |
| **Migrations** | Entity tables in `supabase/migrations/` per AUDIT-REGISTER Platform Unity Map |

## 2. Surface Test Catalog

| ID | Result | Notes |
|----|--------|-------|
| **T-nav** | **Partial** | Auth shell fixed; login still full chrome |

## 3. Live audit notes

- Production baseline **2bb9f02**; branch may add hot day/month, Giphy, Staff link, loginHref.
- Code-informed Pass/Partial/Fail — confirm on https://growersnotebook.com after deploy SHA check.

## 4. Bugs (GN-IDs)

- **GN-003** — see AUDIT-REGISTER for repro

## 5. Platform unity gaps

- SiteProviders wraps SiteChrome post-recovery

## 6. Facebook + Reddit scores (1–5)

| Network | Score | One-line gap |
|---------|-------|----------------|
| Facebook | **3** | Thinner habit/identity loops than Facebook in this slice |
| Reddit | **3** | Vote + community patterns stronger where charter includes feed/community |

## 7. Rewrite candidates (facts only)

- login inside full SiteChrome — cramped mobile

## 8. Role coverage gaps

Guest: next= return. Member: nav refresh on auth.

---
*Phase 1 — no feature recommendations.*
