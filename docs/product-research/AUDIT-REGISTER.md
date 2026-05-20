# Growers Notebook — Phase 1 Audit Register

**Program:** 25-consultant product research (Audit only — no recommendations)  
**Workspace:** `d:/GrowersNotebook`  
**Audit date:** 2026-05-20  
**Method:** Codebase inventory (`apps/web`, `apps/api`, `supabase/migrations`) + recovery matrix alignment; production spot-check assumed at baseline unless noted.

---

## Production deploy note

| Item | Value |
|------|--------|
| **Production baseline (shipped)** | Commit [`2bb9f02`](https://github.com/ProstidudeTTV/GrowersNotebook/commit/2bb9f02) — site recovery: `SiteProviders` → `SiteChrome`, report UX, guest CTAs, settings/community auth gates, role-aware `/admin/health`, moderator remove post |
| **Shipped in research + P0.5 commit** | `docs/product-research/*` (register, 25 audits, RECOMMENDATIONS, FINAL-CONSULTATION-5). Code: hot day/month API; Giphy trending + pagination + DM load-more; feed `community.iconKey`; guest vote `loginHref`; search Following badge + View profile; sidebar **Staff**; client `role` hydration |
| **Verify live** | After push: Render deploy SHA on `growers-notebook-web` + `growers-notebook-api`; re-check T-feed, T-gif, T-nav, T-search |

---

## 17-flow recovery matrix (guest + member)

Source: [Site recovery functional test matrix](file:///c:/Users/johnr/.cursor/plans/admin_and_moderation_repair_7d911184.plan.md) rows 1–17.  
**Legend:** Pass = end-to-end works; Partial = works with known gap; Fail = blocked.

| # | Flow | Route | Guest | Member | Blockers / notes |
|---|------|-------|-------|--------|------------------|
| 1 | Home / feed | `/`, `/following` | **Pass** — guest landing uses `GET /posts/hot/week` + `GET /posts/recent` | **Pass** — following feed + vote/report with session | Authed `/` redirects to `/following` (`page.tsx`) |
| 2 | Hot feed | `/hot` | **Pass** (week default) | **Partial** — day/month need API on prod (GN-001 fixed in branch) | `?range=day|month` → `/posts/hot/{range}` |
| 3 | Inline post composer | feed, community | **Partial** — sign-in CTA | **Pass** — publish paths | GN-011 draft storage unused; three entry points (by design) |
| 4 | New post (profile) | `/new-post` | **Partial** — redirect login | **Pass** | Server auth on settings; composer uses `PostComposer` |
| 5 | New post (community) | `/community/[slug]/new` | **Partial** | **Pass** | Auth gate added in recovery |
| 6 | Post detail | `/p/[id]` | **Pass** — read, guest report CTA | **Pass** — vote, edit owner, report | GN-009 multi-image: detail has carousel; feed shows first only |
| 7 | Comment / reply / report | `/p/[id]#comments` | **Partial** — sign-in to report | **Partial** — report visible; reply depth 0 only (GN-007) | API allows 1-level nest; UI `depth === 0` only for reply |
| 8 | Messages | `/messages` | **Fail** — login required | **Partial** — threads work; Giphy env/pagination (GN-004) | `messages/page.tsx` auth redirect |
| 9 | Profile | `/u/[id]` | **Pass** — public read | **Pass** — follow, report, tabs | |
| 10 | Community hub | `/community/[slug]` | **Pass** | **Partial** — inline composer + `/new`; no public mod bar (GN-010) | Triple post entry (sidebar, inline, + New) |
| 11 | Community directory | `/community` | **Pass** | **Pass** | `communities-directory-client.tsx` |
| 12 | Notebooks | `/notebooks`, `/notebooks/[id]` | **Partial** — public read varies | **Partial** — wizard + week UX | No notebook comment report API |
| 13 | Login / signup | `/login` | **Pass** | **Pass** | `next=` via `login-return-path.ts` (GN-003 fixed); full chrome still heavy |
| 14 | Settings | `/settings/*` | **Fail** — redirect | **Pass** | Profile + notifications split (GN-012) |
| 15 | Search | `/search` | **Partial** | **Partial** | GN-008 notebooks tab stub; growers label fixed (GN-005) |
| 16 | Moderation intake | `/admin/moderation` | **N/A** | **Pass** (staff) | Refine panel; GN-006 Staff link in sidebar (branch) |
| 17 | Admin health | `/admin/health` | **N/A** | **Pass** (admin/mod) | Role-aware rows |

---

## Surface Test Catalog (all T-* rows)

| ID | Surface | Guest | Member | Staff | Result | Bug IDs |
|----|---------|-------|--------|-------|--------|---------|
| **T-search** | `/search` — growers, posts, strains, notebooks tab | Partial | Partial | N/A | **Partial** | GN-005 (fixed label), GN-008 |
| **T-nav** | Sidebar, header, mobile drawer | Pass | Partial | Partial | **Partial** | GN-006 (Staff link branch) |
| **T-notify** | `/notifications` + prefs | Fail (login) | Partial | N/A | **Partial** | GN-012 |
| **T-feed** | `/`, `/following`, `/hot` | Pass | Partial | N/A | **Partial** | GN-001, GN-002, GN-003, GN-009 |
| **T-post** | `/p/[id]`, create paths | Partial | Partial | N/A | **Partial** | GN-009, GN-011 |
| **T-comment** | Thread + composer | Partial | Partial | N/A | **Partial** | GN-007, GN-004 (GIF) |
| **T-profile** | `/u/[id]`, `/settings/profile` | Pass | Pass | N/A | **Pass** | — |
| **T-community** | Hub, directory, `/new` | Pass | Partial | N/A | **Partial** | GN-010 |
| **T-msg** | `/messages` | Fail | Partial | N/A | **Partial** | GN-004 |
| **T-gif** | Giphy route + pickers | Partial | Partial | N/A | **Partial** | GN-004 |
| **T-emoji** | Emoji pickers (post, comment, DM) | Partial | Pass | N/A | **Pass** | — |
| **T-text** | Body fields, validation, embed rules | Partial | Pass | N/A | **Pass** | — |
| **T-media** | Multi-image post feed + detail | Partial | Partial | N/A | **Partial** | GN-009 |
| **T-nb-wiz** | Notebook setup wizard | Fail | Partial | N/A | **Partial** | — |
| **T-nb-week** | Week editor + metrics | Fail | Partial | N/A | **Partial** | — |
| **T-strain** | `/strains`, `/breeders` | Pass | Pass | N/A | **Pass** | — |
| **T-suggest** | `/catalog/suggest` | Partial | Pass | Partial | **Pass** | — |
| **T-admin** | `/admin` Refine | Fail | Partial | Pass | **Pass** | Role-trimmed menu |
| **T-staff-public** | Staff on member site | Fail | Fail | Partial | **Fail** | GN-006 partial (link only); no in-context mod bar |

---

## Platform Unity Map

| Entity | DB (migrations) | Public API | Admin API | UI surfaces | Gap type |
|--------|-----------------|------------|-----------|-------------|----------|
| **Profiles** | `profiles`, privacy/blocks | `profiles.controller.ts` — `/profiles/me`, search, follow | `/admin/profiles` | `/u/[id]`, settings | `broken_link` — strain activity on profile limited |
| **Posts** | `posts`, media, votes | `posts.controller.ts` — list, following, hot/*, search, CRUD | `/admin/posts`, remove | feed, `/p/[id]`, new-post | `UI_only` — feed first image only (GN-009) |
| **Comments** | `comments` | `post-comments.controller.ts` | `comment-reports` | `comment-thread.tsx` | `UI_only` — depth cap (GN-007); no notebook report |
| **DMs** | `dm_*` tables | `direct-messages.controller.ts` | — | `/messages` | `API_only` — no realtime typing; profile link OK |
| **Notebooks** | `notebooks`, weeks | `notebooks.controller.ts` | `admin-notebooks` | `/notebooks/*` | `broken_link` — search tab stub (GN-008); weak post↔notebook share |
| **Communities** | `communities`, moderators | `communities.controller.ts` | admin communities | `/community/*` | `UI_only` — mod API, no public bar (GN-010) |
| **Strains** | strains, breeders, reviews | `public-strains`, `public-breeders` | catalog admin | `/strains`, post tags | `broken_link` — unified search uses list filter not FTS |
| **Votes** | vote aggregates | `votes.controller.ts` | — | feed rail | Pass |
| **Reports** | report tables | post/profile/comment report endpoints | `*-reports` lists | feed, post, profile, comments | `UI_only` — staff actions only in `/admin` |
| **Notifications** | notifications prefs | `notifications.controller.ts` | — | `/notifications`, settings | `broken_link` — prefs vs inbox split (GN-012) |

**Cross-link tests (code-informed):**

| Link | Status |
|------|--------|
| Post author → profile | Pass (`feed-post-card`, `post-view`) |
| Post → community | Pass |
| Comment author → profile | Pass |
| Strain tag → `/strains/[slug]` | Partial — when `strainId` present |
| Notebook owner → profile | Pass |
| Notification `action_url` → route | Partial — `notification-open.ts` |
| Search hit → entity page | Partial — notebooks tab stub |

---

## Numbered bug list (GN-001+)

| ID | Title | Repro | URL / route | Role | Layer | Status |
|----|-------|-------|-------------|------|-------|--------|
| **GN-001** | Hot day/month API missing on production baseline | Open `/hot?range=day` or `month` against API without `GET /posts/hot/day` / `hot/month` | `/hot` | Guest, member | API | **Fixed** in branch (`posts.controller.ts` L80–104) |
| **GN-002** | Feed community `iconKey` null when API omitted field | View post in community without `iconKey` in payload | `/following`, `/hot` | All | UI | **Fixed** — `community.iconKey ?? null` in `feed-post-card.tsx` |
| **GN-003** | Guest vote/login without `next=` return | Guest clicks upvote on feed | Feed routes | Guest | UI | **Fixed** — `loginHref(pathname, search)` |
| **GN-004** | Giphy empty without key; limited picker | Open GIF picker in DM/comment without `GIPHY_API_KEY`; comment picker no load-more | `/messages`, `/p/[id]` | Member | env / UI | **Partial** — trending + offset in `giphy-search/route.ts`, `messages-panel`; comment composer trending, no append |
| **GN-005** | Search Follow pill misleading | Search growers — button said Follow for all | `/search` | Member | UI | **Fixed** — “View profile” |
| **GN-006** | No staff link in sidebar | Moderator must bookmark `/admin` | All member routes | Moderator, admin | UI | **Fixed** — Staff item in `app-sidebar.tsx` (role-gated) |
| **GN-007** | Comment reply depth 0 only in UI | Reply to a reply on post detail | `/p/[id]#comments` | Member | UI | **Open** — `canReply = depth === 0` in `comment-thread.tsx`; API rejects depth > 1 |
| **GN-008** | Search notebooks tab stub | Search → Notebooks tab with query | `/search?type=notebooks` | All | UI | **Open** — honest empty copy, no API |
| **GN-009** | Multi-image feed shows first only | Create post with 2+ images; view on following feed | `/following` | All | UI | **Open** — `feed-post-card.tsx` uses `media?.[0]`; detail uses `PostMediaCarousel` |
| **GN-010** | Community mod tools API only, no public bar | Community mod views `/community/[slug]` | Community page | Community mod | UI | **Open** — placeholder copy; `communities/:id/moderators` API exists |
| **GN-011** | Draft storage unused in composer | `post-composer-draft-storage.ts` has no importers | Feed/community compose | Member | UI | **Open** — dead code |
| **GN-012** | Notifications partial vs settings split | Bell page vs `/settings/notifications` | Both | Member | UI | **Open** — two surfaces, overlapping titles |

---

## Facebook / Reddit summary (1–5 by area)

| Area | Facebook | Reddit | Notes |
|------|----------|--------|-------|
| Home feed | 3 | 4 | Vote rail + community chip; weak multi-image; following default good |
| Hot / sort | 3 | 4 | Week hot strong; day/month pending prod deploy |
| Post detail | 3 | 3 | GrowDiaries hero; carousel OK; share/report recovered |
| Comments | 2 | 2 | Report visible; no nested UI; no @mentions |
| Create post | 3 | 3 | Three paths functional; draft story inconsistent |
| Community | 3 | 4 | Banner/stats; triple entry confusion; no subreddit mod bar |
| Profile | 3 | 3 | Tabs + follow; sparse customization vs FB |
| Messages | 3 | 2 | Messenger layout; Giphy partial |
| Search | 2 | 2 | No unified FTS; notebooks stub |
| Notifications | 2 | 2 | Inbox exists; prefs separate |
| Multi-image | 2 | 2 | Detail carousel; feed single hero |
| Staff on public site | 1 | 2 | Admin panel only; sidebar Staff link improving |
| Notebooks × social | 2 | 1 | Strong wizard; weak feed integration |
| Guest conversion | 3 | 3 | Honest CTAs post-recovery; login chrome heavy |

**Consultant detail:** see `docs/product-research/consultants/consultant-{NN}-*-AUDIT.md`.

---

## Consultant index

| # | Slug | File |
|---|------|------|
| 01 | feed-architect | `consultant-01-feed-architect-AUDIT.md` |
| 02 | post-composer-strategist | `consultant-02-post-composer-strategist-AUDIT.md` |
| 03 | post-detail-growdiaries | `consultant-03-post-detail-growdiaries-AUDIT.md` |
| 04 | comment-thread-designer | `consultant-04-comment-thread-designer-AUDIT.md` |
| 05 | messaging-consultant | `consultant-05-messaging-consultant-AUDIT.md` |
| 06 | community-subreddit | `consultant-06-community-subreddit-AUDIT.md` |
| 07 | profile-social | `consultant-07-profile-social-AUDIT.md` |
| 08 | discovery-search | `consultant-08-discovery-search-AUDIT.md` |
| 09 | notifications-engagement | `consultant-09-notifications-engagement-AUDIT.md` |
| 10 | onboarding-auth | `consultant-10-onboarding-auth-AUDIT.md` |
| 11 | notebook-product-lead | `consultant-11-notebook-product-lead-AUDIT.md` |
| 12 | strain-catalog-ux | `consultant-12-strain-catalog-ux-AUDIT.md` |
| 13 | trust-safety-member | `consultant-13-trust-safety-member-AUDIT.md` |
| 14 | guest-vs-member-parity | `consultant-14-guest-vs-member-parity-AUDIT.md` |
| 15 | moderation-ops | `consultant-15-moderation-ops-AUDIT.md` |
| 16 | admin-dashboard-stats | `consultant-16-admin-dashboard-stats-AUDIT.md` |
| 17 | admin-content-cms | `consultant-17-admin-content-cms-AUDIT.md` |
| 18 | admin-catalog-staff | `consultant-18-admin-catalog-staff-AUDIT.md` |
| 19 | admin-policy-roles | `consultant-19-admin-policy-roles-AUDIT.md` |
| 20 | shell-layout-ia | `consultant-20-shell-layout-ia-AUDIT.md` |
| 21 | design-system-guardian | `consultant-21-design-system-guardian-AUDIT.md` |
| 22 | platform-unity-auditor | `consultant-22-platform-unity-auditor-AUDIT.md` |
| 23 | observability-health | `consultant-23-observability-health-AUDIT.md` |
| 24 | mobile-responsive | `consultant-24-mobile-responsive-AUDIT.md` |
| 25 | competitor-benchmark-lead | `consultant-25-competitor-benchmark-lead-AUDIT.md` |
