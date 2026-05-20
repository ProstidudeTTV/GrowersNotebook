# Growers Notebook — Phase 2 Recommendations

**Program:** 25-consultant product research → Review & recommend  
**Inputs:** [AUDIT-REGISTER.md](./AUDIT-REGISTER.md), `consultants/consultant-{01–25}-*-AUDIT.md`  
**Date:** 2026-05-20  
**Baseline:** Production commit [`2bb9f02`](https://github.com/ProstidudeTTV/GrowersNotebook/commit/2bb9f02); branch delta documented in register (hot day/month, Giphy, Staff link, `iconKey`, `loginHref`, search label).

**Decision labels (every major finding):**

| Label | Meaning |
|-------|---------|
| **REWRITE** | Replace or substantially refactor existing surface; charter mismatch or structural debt |
| **EXTEND** | Ship on current architecture; close known gap with targeted change |
| **NEW_CROSS** | New link between two entities (post↔notebook, notification→route, etc.) |
| **NEW_RICH** | New depth on one entity (profile fields, mod bar, multi-image grid) |
| **FLOW_BAR** | Close Facebook/Reddit habit loop (scorecard-driven UX parity) |
| **DEFER** | Honest backlog; not Phase 3 Must |
| **WONT** | Out of charter or rejected for trust/design rules |

**Backlog tags:** `REAL_RICH` = entity depth; `REAL_CROSS` = cross-entity link; `FLOW_BAR` = loop parity item.

---

## 1. Phase 1 audit summary

Phase 1 audited **25 consultant charters** against `apps/web`, `apps/api`, and `supabase/migrations`. No recommendations were written in Phase 1; findings live in [AUDIT-REGISTER.md](./AUDIT-REGISTER.md).

### 1.1 Production vs branch

| State | Detail |
|-------|--------|
| **Shipped (2bb9f02)** | Site recovery: `SiteChrome`, guest CTAs, auth gates, role-aware `/admin/health`, moderator remove post |
| **Branch (verify via Render SHA)** | `GET /posts/hot/day`, `GET /posts/hot/month`; `/hot?range=`; Giphy trending + offset; feed `community.iconKey`; guest vote `loginHref`; search “View profile”; sidebar **Staff** link |

### 1.2 Recovery matrix (17 flows)

| Result | Count | Examples |
|--------|-------|----------|
| **Pass** | 9 | Home/following, post detail read, profile, community directory, login, settings (member), moderation intake, admin health |
| **Partial** | 7 | Hot day/month (GN-001), comments (GN-007), messages/Giphy (GN-004), search (GN-008), community mod (GN-010), notebooks, guest composers |
| **Fail** | 1 | Messages for guests (by design — login required) |

### 1.3 Surface catalog (T-*)

**Pass:** T-profile, T-strains, T-suggest, T-admin, T-emoji, T-text  
**Partial:** T-feed, T-post, T-comment, T-community, T-msg, T-gif, T-search, T-nav, T-notify, T-media, T-nb-*  
**Fail:** T-staff-public (admin-only moderation; GN-006 improves discoverability only)

### 1.4 Platform unity (headline gaps)

| Gap type | Examples |
|----------|----------|
| `UI_only` | Feed first image only (GN-009); comment depth UI (GN-007); community mod API without bar (GN-010); reports staff-only in `/admin` |
| `broken_link` | Notebook search stub (GN-008); strain activity on profile; post↔notebook share weak |
| `API_only` | DM no typing/realtime; notebook comment report missing |

### 1.5 Competitor rollup (register § FB/RD)

Strongest: home/following (3/4), community hub (3/4), guest conversion (3/3).  
Weakest: comments (2/2), search (2/2), staff on public site (**Fail** / 1–2), notebooks×social (2/1).

---

## 2. GN register → Phase 2 decisions

| ID | Title | Phase 2 decision | Rationale |
|----|-------|------------------|-----------|
| **GN-001** | Hot day/month API | **EXTEND** | Endpoints exist in branch; **Must** deploy API+web together; closes hot loop |
| **GN-002** | Feed `iconKey` null | **EXTEND** | Fixed in `feed-post-card.tsx`; ship with hot batch |
| **GN-003** | Guest vote without `next=` | **EXTEND** | `loginHref` fixed; **FLOW_BAR** for guest→member return |
| **GN-004** | Giphy empty / limited picker | **EXTEND** + **FLOW_BAR** | P0.5 partial: DM load-more + env; comment picker parity **Should** |
| **GN-005** | Search Follow pill | **EXTEND** | Fixed “View profile”; no further work |
| **GN-006** | No staff sidebar link | **EXTEND** | Staff item shipped in branch; **FLOW_BAR** for mod discoverability |
| **GN-007** | Comment reply depth 0 only | **REWRITE** + **FLOW_BAR** | Align `comment-thread.tsx` with API 1-level nest; then consider depth-2 **DEFER** |
| **GN-008** | Search notebooks tab stub | **NEW_CROSS** + **EXTEND** | Add `GET /notebooks/search` + wire tab; unified discovery |
| **GN-009** | Multi-image feed first only | **REWRITE** + **NEW_RICH** | `feed-post-card` grid/carousel; highest visual parity gap |
| **GN-010** | Community mod API, no public bar | **NEW_RICH** + **FLOW_BAR** | In-context mod strip on `/community/[slug]` + post actions |
| **GN-011** | Draft storage unused | **EXTEND** or **DEFER** | Wire `post-composer-draft-storage` to composers **Should**; else remove dead code **WONT** duplicate UX |
| **GN-012** | Notifications vs settings split | **EXTEND** + **FLOW_BAR** | Single mental model: inbox + prefs cross-links |

---

## 3. Cross-functionality map (entity × entity)

**Legend:** ✅ Pass · ⚠️ Partial · ❌ Missing · 🔧 Phase 3 target

|  | Profiles | Posts | Comments | DMs | Notebooks | Communities | Strains | Votes | Reports | Notifications |
|--|----------|-------|----------|-----|-----------|-------------|---------|-------|---------|---------------|
| **Profiles** | — | ✅ author | ✅ author | ✅ thread peer | ✅ owner | ⚠️ membership | ⚠️ activity | — | ✅ target | ⚠️ prefs |
| **Posts** | ✅ | — | ✅ | ❌ share to DM | 🔧 share card | ✅ | ⚠️ tag | ✅ | ✅ | ⚠️ |
| **Comments** | ✅ | ✅ | ⚠️ depth | ❌ | ❌ report | — | — | ⚠️ | ✅ | ⚠️ |
| **DMs** | ✅ | ❌ | — | — | ❌ | ❌ | ❌ | — | ❌ | ❌ |
| **Notebooks** | ✅ | 🔧 REC-028 | ❌ | ❌ | — | ❌ | ⚠️ strain | — | ❌ | ❌ |
| **Communities** | ⚠️ mods | ✅ | — | — | ❌ | — | — | — | 🔧 mod bar | ⚠️ |
| **Strains** | ⚠️ | ⚠️ tag | — | — | ⚠️ | — | — | — | — | — |
| **Votes** | — | ✅ | ⚠️ | — | — | — | — | — | — | — |
| **Reports** | ✅ | ✅ | ✅ | ❌ | ❌ | 🔧 | — | — | — | — |
| **Notifications** | ⚠️ | ⚠️ `action_url` | ⚠️ | ❌ | ❌ | ❌ | ❌ | — | — | — |

**Priority cross-links (Phase 3):** Post↔Notebook share (REC-028–030), Notebook search (REC-031–033), Notification deep links (REC-034–036), Community mod on public surface (REC-037–040).

---

## 4. Facebook / Reddit flow scorecard (12 loops)

Scores **1–5** (5 = parity with reference network for cannabis social). **Gap** = narrative for Phase 3.

| # | Loop | FB | RD | Gap narrative | Phase 2 label |
|---|------|----|----|---------------|---------------|
| 1 | **Land → scroll feed** | 3 | 4 | Following default strong; guest hot/recent honest; multi-image weak on card | **FLOW_BAR** (GN-009) |
| 2 | **Vote → see score move** | 3 | 4 | Rail works; guest `loginHref` fixes return (GN-003) | **EXTEND** |
| 3 | **Hot / time sort** | 3 | 4 | Week solid; day/month blocked on prod until deploy (GN-001) | **EXTEND** |
| 4 | **Create post (any entry)** | 3 | 3 | Three paths OK; draft story inconsistent (GN-011); no feed duplicate | **EXTEND** / **DEFER** |
| 5 | **Open post → read → share** | 3 | 3 | GrowDiaries hero + carousel; share/report recovered | **EXTEND** |
| 6 | **Comment → reply thread** | 2 | 2 | Lowest social loop; depth-0 UI vs API; no @mentions | **REWRITE** (GN-007) |
| 7 | **Join community → post there** | 3 | 4 | Banner/stats good; triple composer confusing; no subreddit mod bar | **NEW_RICH** (GN-010) |
| 8 | **Discover via search** | 2 | 2 | List filters not FTS; notebooks stub (GN-008) | **NEW_CROSS** |
| 9 | **Profile → follow → feed** | 3 | 3 | Tabs work; sparse vs FB profile richness | **NEW_RICH** |
| 10 | **DM thread → GIF** | 3 | 2 | Layout good; Giphy env + pagination partial (GN-004) | **EXTEND** |
| 11 | **Report → trust** | 3 | 3 | Member report paths OK; staff only in admin | **NEW_RICH** (in-context mod) |
| 12 | **Staff moderate in context** | 1 | 2 | Fail T-staff-public; sidebar Staff helps not sufficient | **FLOW_BAR** (GN-006, GN-010) |

**Program average:** Facebook **2.6** · Reddit **2.9** — Phase 3 Must targets loops **6, 8, 12** plus **1** (multi-image).

---

## 5. Rewrite backlog

Components or modules where audit cited **rewrite candidates** (facts-only in Phase 1). Phase 2 assigns **REWRITE** when extension cannot close the charter gap.

| Target | GN / consultant | Decision | Backlog IDs |
|--------|-----------------|----------|-------------|
| `feed-post-card.tsx` — `media?.[0]` only | GN-009, #01, #21 | **REWRITE** | REC-020–024 |
| `comment-thread.tsx` — `canReply = depth === 0` | GN-007, #04 | **REWRITE** | REC-015–019 |
| `search/page.tsx` — notebooks stub tab | GN-008, #08 | **REWRITE** (tab + API) | REC-031–033 |
| `community/[slug]/page.tsx` — placeholder mods | GN-010, #06 | **REWRITE** (mod strip section) | REC-037–040 |
| `post-composer` + draft storage (wire or delete) | GN-011, #02 | **EXTEND** preferred; else delete | REC-041–043 |
| `messages-panel.tsx` / Giphy client | GN-004, #05 | **EXTEND** not full rewrite | REC-010–014 |
| `notification` surfaces + settings | GN-012, #09 | **EXTEND** unify IA | REC-044–047 |
| Login chrome (`/login`) | #10 | **EXTEND** lighten guest shell | REC-048–049 |

---

## 6. Backlog (REC-001+)

**Count:** 72 items (≥60 required).  
**Columns:** ID · Title · Tags · Decision · GN · MoSCoW

### 6.1 Deploy & recovery (Must)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-001 | Deploy `GET /posts/hot/day` + `month` to production API | FLOW_BAR | EXTEND | GN-001 | **Must** |
| REC-002 | Ship `/hot?range=day\|month` with API parity | FLOW_BAR | EXTEND | GN-001 | **Must** |
| REC-003 | Verify Render web+api SHA after hot deploy | — | EXTEND | — | **Must** |
| REC-004 | Ship feed `community.iconKey ?? null` mapping | REAL_RICH | EXTEND | GN-002 | **Must** |
| REC-005 | Ship guest vote `loginHref(pathname, search)` on all feed cards | FLOW_BAR | EXTEND | GN-003 | **Must** |
| REC-006 | Ship search grower row “View profile” (regression guard) | FLOW_BAR | EXTEND | GN-005 | **Must** |
| REC-007 | Ship role-gated sidebar **Staff** → `/admin` | FLOW_BAR | EXTEND | GN-006 | **Must** |

### 6.2 Giphy P0.5 (Must / Should)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-008 | Document `GIPHY_API_KEY` in Render web env (runbook) | — | EXTEND | GN-004 | **Must** |
| REC-009 | DM GIF picker: offset load-more (branch) to production | FLOW_BAR | EXTEND | GN-004 | **Must** |
| REC-010 | Comment GIF picker: same load-more as messages | FLOW_BAR | EXTEND | GN-004 | **Should** |
| REC-011 | Empty-state copy when Giphy key missing (no fake GIFs) | — | EXTEND | GN-004 | **Should** |
| REC-012 | Shared `giphy-search-client` pagination helper | — | EXTEND | GN-004 | **Should** |
| REC-013 | Post composer GIF entry (parity with comment/DM) | REAL_RICH | EXTEND | GN-004 | **Could** |
| REC-014 | Rate-limit / cache headers on `/api/giphy-search` | — | EXTEND | — | **Could** |

### 6.3 Feed & media (Must / Should)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-015 | Enable reply UI at depth 1 (match API parentId rule) | FLOW_BAR | REWRITE | GN-007 | **Must** |
| REC-016 | Visual indent + border for nested comment | REAL_RICH | REWRITE | GN-007 | **Must** |
| REC-017 | Collapse “Continue thread” for depth > 1 | FLOW_BAR | DEFER | GN-007 | **Could** |
| REC-018 | Comment @mention autocomplete | REAL_RICH | NEW_RICH | — | **Won't** (v2) |
| REC-019 | Comment vote affordance on nested rows | FLOW_BAR | EXTEND | GN-007 | **Should** |
| REC-020 | Feed multi-image grid (2–4 thumbs + count badge) | REAL_RICH | REWRITE | GN-009 | **Must** |
| REC-021 | Feed hero: swipe or dot indicator for N images | FLOW_BAR | REWRITE | GN-009 | **Should** |
| REC-022 | Lazy-load non-first feed images | — | EXTEND | GN-009 | **Should** |
| REC-023 | Alt text / caption from post media on feed | REAL_RICH | EXTEND | GN-009 | **Could** |
| REC-024 | Align `feed-post.ts` types with multi-media display | — | EXTEND | GN-009 | **Must** |
| REC-025 | Sidebar layout hot widget: respect user range or week-only label | FLOW_BAR | EXTEND | GN-001 | **Should** |
| REC-026 | Following feed empty state: honest CTA to `/hot` + `/community` | FLOW_BAR | EXTEND | — | **Should** |
| REC-027 | Guest landing: cap hero posts from real APIs only | — | EXTEND | — | **Must** (guard) |

### 6.4 Post ↔ notebook cross-links (Should)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-028 | “Share grow” card: link post to `notebook_id` on create | REAL_CROSS | NEW_CROSS | — | **Should** |
| REC-029 | Post detail sidebar: linked notebook week snapshot | REAL_CROSS | NEW_CROSS | — | **Should** |
| REC-030 | Notebook public page: list linked posts | REAL_CROSS | NEW_CROSS | — | **Should** |
| REC-031 | API `GET /notebooks/search?q=` | REAL_CROSS | NEW_CROSS | GN-008 | **Should** |
| REC-032 | Search tab: wire notebooks to API (remove stub) | REAL_CROSS | REWRITE | GN-008 | **Should** |
| REC-033 | Unified search result component (profile/post/strain/nb) | FLOW_BAR | EXTEND | GN-008 | **Could** |

### 6.5 Notifications & engagement (Should)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-034 | Audit `notification-open.ts` routes; fix broken `action_url` | REAL_CROSS | EXTEND | GN-012 | **Should** |
| REC-035 | Bell page header link → `/settings/notifications` | FLOW_BAR | EXTEND | GN-012 | **Should** |
| REC-036 | Settings notifications: preview of inbox categories | REAL_RICH | EXTEND | GN-012 | **Could** |
| REC-044 | Merge duplicate notification copy titles | — | EXTEND | GN-012 | **Should** |
| REC-045 | Push/email prefs: single source of truth doc | — | EXTEND | GN-012 | **Could** |

### 6.6 Community & moderation (Must / Should)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-037 | Community page: mod bar (pin/remove/lock) for community mods | REAL_RICH, FLOW_BAR | NEW_RICH | GN-010 | **Must** |
| REC-038 | Post detail: staff quick actions strip (role-gated) | FLOW_BAR | NEW_RICH | GN-010 | **Should** |
| REC-039 | Wire `GET communities/:id/moderators` to public About | REAL_RICH | REWRITE | GN-010 | **Should** |
| REC-040 | Community join CTA + post sort sticky (regression) | FLOW_BAR | EXTEND | — | **Should** |
| REC-046 | Reduce triple composer confusion: one primary + “New post” link | FLOW_BAR | EXTEND | #06 | **Should** |
| REC-047 | Moderator queue deep link from community mod bar | REAL_CROSS | NEW_CROSS | GN-010 | **Could** |

### 6.7 Composer & drafts (Should / Defer)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-041 | Import draft storage in `PostComposer` + community inline | — | EXTEND | GN-011 | **Should** |
| REC-042 | Autosave draft per community slug + `/new-post` | REAL_RICH | EXTEND | GN-011 | **Could** |
| REC-043 | Remove `post-composer-draft-storage.ts` if unwired by Phase 3 end | — | WONT | GN-011 | **Won't** (alt) |

### 6.8 Profile, auth, shell (Should / Could)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-048 | Login page: minimal chrome variant (no full sidebar) | FLOW_BAR | EXTEND | #10 | **Should** |
| REC-049 | Preserve `next=` on all auth gates (regression test) | FLOW_BAR | EXTEND | GN-003 | **Must** |
| REC-050 | Profile: cover/bio richness (no fake metrics) | REAL_RICH | NEW_RICH | #07 | **Should** |
| REC-051 | Profile Media tab: grid from real post media API | REAL_RICH | EXTEND | #07 | **Should** |
| REC-052 | Profile strain activity from real reviews | REAL_CROSS | NEW_CROSS | — | **Could** |
| REC-053 | Mobile drawer: Staff item when role allows | FLOW_BAR | EXTEND | GN-006 | **Should** |

### 6.9 Messages (Should / Could)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-054 | DM: link preview for shared `/p/` URLs | REAL_CROSS | NEW_CROSS | #05 | **Could** |
| REC-055 | DM: typing indicator (realtime channel) | FLOW_BAR | DEFER | #05 | **Won't** (v2) |
| REC-056 | DM thread list: unread badge from API | REAL_RICH | EXTEND | #05 | **Should** |

### 6.10 Search & strains (Should / Could)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-057 | Postgres FTS or `tsvector` for posts (spike) | — | DEFER | #08 | **Could** |
| REC-058 | Strain search relevance: slug + name ranking | REAL_RICH | EXTEND | #12 | **Could** |
| REC-059 | Search communities tab | REAL_CROSS | NEW_CROSS | #08 | **Could** |

### 6.11 Notebooks (Should / Defer)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-060 | Notebook week: share week as post (prefill composer) | REAL_CROSS | NEW_CROSS | #11 | **Should** |
| REC-061 | Notebook comment report API | REAL_CROSS | NEW_CROSS | — | **Could** |
| REC-062 | Guest notebook read: respect visibility flags only | — | EXTEND | — | **Must** (guard) |

### 6.12 Admin & trust (Should / Won't)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-063 | Admin dashboard: live counts from API (no placeholders) | — | EXTEND | #16 | **Should** |
| REC-064 | Member site: never show fake platform stats | — | WONT | rules | **Won't** |
| REC-065 | In-feed mod actions only for scoped roles | FLOW_BAR | EXTEND | GN-010 | **Must** |

### 6.13 Design system & mobile (Could)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-066 | Grep CI: no hardcoded hex in changed components | — | EXTEND | #21 | **Should** |
| REC-067 | Feed card vote rail touch targets 44px mobile | FLOW_BAR | EXTEND | #24 | **Should** |
| REC-068 | Community banner LCP image priority | — | EXTEND | #24 | **Could** |

### 6.14 Observability (Could)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-069 | `/admin/health` link from Staff sidebar for admins | REAL_CROSS | EXTEND | #23 | **Could** |
| REC-070 | Structured log on hot range API errors | — | EXTEND | GN-001 | **Could** |

### 6.15 Deferred / won't (explicit)

| ID | Title | Tags | Decision | GN | MoSCoW |
|----|-------|------|----------|-----|--------|
| REC-071 | Second-level comment nesting (depth 2+) | FLOW_BAR | DEFER | GN-007 | **Won't** (v2) |
| REC-072 | Fake “LIVE” or inflated member counts on marketing | — | WONT | rules | **Won't** |

---

## 7. MoSCoW summary (Phase 3 build)

### Must (ship first batch)

- REC-001–007 (hot API, iconKey, loginHref, search label, Staff link + verify deploy)
- REC-008–009 (Giphy P0.5 production: key + DM load-more)
- REC-015–016, REC-020, REC-024–027 (comment depth-1 UI, multi-image feed rewrite, guards)
- REC-037, REC-049, REC-062–065 (community mod bar, auth return, honesty guards, scoped mod actions)

### Should (approved Phase 3 — next batches)

- REC-010–012, REC-019–023, REC-025–026, REC-028–032, REC-034–035, REC-038–041, REC-044, REC-046, REC-048, REC-050–051, REC-053, REC-056, REC-060, REC-063, REC-066–067

### Could (quality / discovery depth)

- REC-013–014, REC-017, REC-023, REC-033, REC-036, REC-042, REC-045, REC-047, REC-052–054, REC-057–059, REC-061, REC-068–070

### Won't (this program)

- REC-018 (@mentions v2), REC-055 (DM typing v2), REC-064, REC-072 (fake metrics), REC-071 (depth 2+ until depth-1 stable)
- REC-043 only if REC-041 fails (delete dead draft module)

---

## 8. Major findings with decision labels

| Finding | Decision | Backlog |
|---------|----------|---------|
| Hot day/month not on production | **EXTEND** | REC-001–003 |
| Feed truncates multi-image | **REWRITE** + **NEW_RICH** | REC-020–024 |
| Comment thread depth mismatch | **REWRITE** + **FLOW_BAR** | REC-015–019 |
| Notebook search disconnected | **NEW_CROSS** + **REWRITE** | REC-031–033 |
| Community mod tools admin-only | **NEW_RICH** + **FLOW_BAR** | REC-037–040 |
| Giphy partial across surfaces | **EXTEND** + **FLOW_BAR** | REC-008–014 |
| Guest vote return path | **EXTEND** + **FLOW_BAR** | REC-005, REC-049 |
| Staff discoverability | **EXTEND** + **FLOW_BAR** | REC-007, REC-053 |
| Notifications split UX | **EXTEND** + **FLOW_BAR** | REC-034–036, REC-044–045 |
| Post↔notebook silo | **NEW_CROSS** | REC-028–030, REC-060 |
| Profile richness vs Facebook | **NEW_RICH** | REC-050–052 |
| Unified FTS search | **DEFER** | REC-057 |
| DM realtime typing | **DEFER** / **WONT** v2 | REC-055 |
| @mentions in comments | **WONT** v2 | REC-018 |
| Fake stats / mock feed | **WONT** | REC-064, REC-072 |

---

## 9. Maintainer sign-off — Approved for Phase 3 Build

**Status:** Ready for maintainer checkbox approval before implementation sprints.

### 9.1 Approved immediate batches (partial or branch-complete)

| Batch | Scope | Register / notes |
|-------|--------|------------------|
| **Giphy P0.5** | `GIPHY_API_KEY` on Render web; DM trending + offset/load-more; comment picker parity (REC-008–012) | GN-004 — **partial done** in branch |
| **Hot API** | `GET /posts/hot/day`, `GET /posts/hot/month` + `/hot?range=` (REC-001–003) | GN-001 — fixed in branch, **Must deploy** |
| **Staff sidebar** | Role-gated **Staff** → `/admin` (REC-007, REC-053) | GN-006 — fixed in branch |
| **Feed iconKey + loginHref** | `community.iconKey ?? null`; guest vote `loginHref` (REC-004–005) | GN-002, GN-003 — fixed in branch |
| **Search fix** | Grower hits → “View profile” (REC-006) | GN-005 — fixed in branch |

### 9.2 Approved future batches (Phase 3 Should+)

| Batch | REC IDs | Decision mix |
|-------|---------|--------------|
| **Multi-image grid** | REC-020–024 | REWRITE + NEW_RICH (GN-009) |
| **In-context mod strip** | REC-037–040, REC-065 | NEW_RICH + FLOW_BAR (GN-010) |
| **Comment depth** | REC-015–019 | REWRITE (GN-007) |
| **Unified search notebooks** | REC-031–033 | NEW_CROSS + REWRITE (GN-008) |
| **Community mod bar + composer IA** | REC-037, REC-046 | NEW_RICH + EXTEND |
| **Profile richness** | REC-050–052 | NEW_RICH |
| **Post↔notebook share** | REC-028–030, REC-060 | NEW_CROSS |
| **Notifications unify** | REC-034–036, REC-044 | EXTEND + FLOW_BAR (GN-012) |
| **Composer drafts** | REC-041–042 | EXTEND (GN-011) |

### 9.3 Sign-off block

```
Maintainer: _________________________   Date: __________

[ ] Approved for Phase 3 Build — batches in §9.1 deployed and verified on Render SHA
[ ] Approved for Phase 3 Build — §9.2 prioritized in sprint order (Must → Should → Could)
[ ] GN-001–GN-012 decisions in §2 accepted
[ ] No fake data / mock feed — REC-027, REC-062, REC-064, REC-072 acknowledged

Notes:
_________________________________________________________________
_________________________________________________________________
```

---

## 10. Consultant index (Phase 2 pointers)

| # | Slug | Primary REC themes |
|---|------|-------------------|
| 01 | feed-architect | REC-020–027 |
| 02 | post-composer-strategist | REC-041–043, REC-046 |
| 03 | post-detail-growdiaries | REC-020–024, REC-038 |
| 04 | comment-thread-designer | REC-015–019 |
| 05 | messaging-consultant | REC-008–014, REC-054–056 |
| 06 | community-subreddit | REC-037–040, REC-046 |
| 07 | profile-social | REC-050–052 |
| 08 | discovery-search | REC-031–033, REC-057–059 |
| 09 | notifications-engagement | REC-034–036, REC-044–045 |
| 10 | onboarding-auth | REC-048–049 |
| 11 | notebook-product-lead | REC-028–030, REC-060–062 |
| 12 | strain-catalog-ux | REC-058 |
| 13 | trust-safety-member | REC-065 |
| 14 | guest-vs-member-parity | REC-005, REC-027, REC-049 |
| 15 | moderation-ops | REC-037–040, REC-047 |
| 16–19 | admin-* | REC-063 |
| 20 | shell-layout-ia | REC-046, REC-053 |
| 21 | design-system-guardian | REC-066 |
| 22 | platform-unity-auditor | §3 cross-map |
| 23 | observability-health | REC-069–070 |
| 24 | mobile-responsive | REC-067–068 |
| 25 | competitor-benchmark-lead | §4 scorecard |

---

*Phase 2 complete. Phase 3 implementation must not edit the original plan file; trace work via REC-IDs and GN-IDs above.*
