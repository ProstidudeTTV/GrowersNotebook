import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['member', 'moderator', 'admin']);

export const catalogSuggestionKindEnum = pgEnum('catalog_suggestion_kind', [
  'new_strain',
  'new_breeder',
  'edit_strain',
  'edit_breeder',
]);

export const catalogSuggestionStatusEnum = pgEnum('catalog_suggestion_status', [
  'pending',
  'approved',
  'rejected',
]);

export const notebookStatusEnum = pgEnum('notebook_status', [
  'active',
  'completed',
  'archived',
]);

export const notebookRoomTypeEnum = pgEnum('notebook_room_type', [
  'indoor',
  'outdoor',
  'greenhouse',
]);

export const notebookWateringTypeEnum = pgEnum('notebook_watering_type', [
  'manual',
  'drip',
  'hydro',
  'aeroponic',
]);

export const notebookStartTypeEnum = pgEnum('notebook_start_type', [
  'seed',
  'clone',
  'seedling',
]);

export const notebookGrowthStageEnum = pgEnum('notebook_growth_stage', [
  'germination',
  'vegetation',
  'flower',
  'harvest',
]);

/** Drizzle pgEnum helper type for suggestion kinds */
export type CatalogSuggestionKind =
  (typeof catalogSuggestionKindEnum.enumValues)[number];

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  /** Short intro / bio shown on the public profile. */
  description: text('description'),
  avatarUrl: text('avatar_url'),
  /** When false, only the account owner can load the public profile and activity feeds. */
  profilePublic: boolean('profile_public').notNull().default(true),
  /** When false, non-owners do not see seed count or grower tier on the profile card. */
  showGrowerStatsPublic: boolean('show_grower_stats_public')
    .notNull()
    .default(true),
  /** When false, non-owners do not see this user's notebooks on the profile or public listings. */
  showNotebooksPublic: boolean('show_notebooks_public')
    .notNull()
    .default(true),
  role: roleEnum('role').notNull().default('member'),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Attachments for a post (URLs to bucket objects or external https assets). */
export type PostMediaItem = { url: string; type: 'image' | 'video' };

/** Optional 1–5 sub-scores on strain / breeder reviews. */
export type CatalogReviewSubRatings = Partial<
  Record<
    | 'effects'
    | 'flavor'
    | 'potency'
    | 'taste'
    | 'aroma'
    | 'duration'
    | 'onset',
    number
  >
>;

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    /** Curated icon id for sidebar / directory (set in admin). */
    iconKey: text('icon_key'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('communities_slug_idx').on(t.slug)],
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Null = profile post (not tied to a community). */
    communityId: uuid('community_id').references(() => communities.id, {
      onDelete: 'cascade',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** TipTap / ProseMirror JSON document */
    bodyJson: jsonb('body_json').notNull().$type<Record<string, unknown>>(),
    /** Stored sanitized HTML for display and excerpt generation */
    bodyHtml: text('body_html').notNull().default(''),
    /** Uploaded or linked media, separate from rich-text body. */
    media: jsonb('media')
      .notNull()
      .$type<PostMediaItem[]>()
      .default(sql`'[]'::jsonb`),
    excerpt: text('excerpt'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('posts_community_created_idx').on(t.communityId, t.createdAt),
    index('posts_author_idx').on(t.authorId),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
    /** Public `post-media` URLs; may be empty when `body` carries text only. */
    imageUrls: jsonb('image_urls')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('comments_post_created_idx').on(t.postId, t.createdAt),
    index('comments_parent_idx').on(t.parentId),
  ],
);

export const postVotes = pgTable(
  'post_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('post_votes_post_idx').on(t.postId),
  ],
);

export const commentVotes = pgTable(
  'comment_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    /** Denormalized for Supabase Realtime filters (`post_id=eq...`) and indexes. */
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index('comment_votes_comment_idx').on(t.commentId),
    index('comment_votes_post_idx').on(t.postId),
  ],
);

export const commentReports = pgTable(
  'comment_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    /** open | dismissed | removed */
    status: text('status').notNull().default('open'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    reporterMessage: text('reporter_message'),
    notifyReported: boolean('notify_reported').notNull().default(false),
    reportedWarning: text('reported_warning'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('comment_reports_post_idx').on(t.postId),
    uniqueIndex('comment_reports_comment_reporter_uq').on(
      t.commentId,
      t.reporterId,
    ),
  ],
);

export const postReports = pgTable(
  'post_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('post_reports_created_idx').on(t.createdAt),
    uniqueIndex('post_reports_post_reporter_uq').on(t.postId, t.reporterId),
  ],
);

export const profileReports = pgTable(
  'profile_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    status: text('status').notNull().default('open'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    reporterMessage: text('reporter_message'),
    notifyReported: boolean('notify_reported').notNull().default(false),
    reportedWarning: text('reported_warning'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('profile_reports_created_idx').on(t.createdAt),
    uniqueIndex('profile_reports_reported_reporter_uq').on(
      t.reportedUserId,
      t.reporterId,
    ),
    check(
      'profile_reports_no_self',
      sql`reporter_id <> reported_user_id`,
    ),
  ],
);

export const userFollows = pgTable(
  'user_follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index('user_follows_following_idx').on(t.followingId),
    check('user_follows_no_self', sql`follower_id <> following_id`),
  ],
);

/** One-way block; feeds + DMs hide both directions for the pair. */
export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    index('user_blocks_blocked_idx').on(t.blockedId),
    check('user_blocks_no_self', sql`blocker_id <> blocked_id`),
  ],
);

export const userNotifications = pgTable(
  'user_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** general | report_update | moderation_warning */
    kind: text('kind').notNull().default('general'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('user_notifications_user_created_idx').on(t.userId, t.createdAt),
  ],
);

/** Normalized lowercase terms; if any appear as a substring in a name, the name is rejected. */
export const nameBlocklist = pgTable(
  'name_blocklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    term: text('term').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('name_blocklist_created_idx').on(t.createdAt)],
);

export const communityFollows = pgTable(
  'community_follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.communityId] }),
    index('community_follows_community_idx').on(t.communityId),
  ],
);

/** Moderators/admins-of-record for a community (pin posts, etc.). Site `admin` bypasses this. */
export const communityModerators = pgTable(
  'community_moderators',
  {
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    moderatorId: uuid('moderator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.moderatorId] }),
    index('community_moderators_user_idx').on(t.moderatorId),
  ],
);

/** Pinned posts appear at the top of a community feed (oldest pin first). */
export const communityPins = pgTable(
  'community_pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    pinnedAt: timestamp('pinned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    pinnedBy: uuid('pinned_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('community_pins_community_post_uq').on(
      t.communityId,
      t.postId,
    ),
    index('community_pins_community_idx').on(t.communityId),
  ],
);

/** Breeders (catalog). */
export const breeders = pgTable(
  'breeders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    website: text('website'),
    country: text('country'),
    published: boolean('published').notNull().default(true),
    reviewCount: integer('review_count').notNull().default(0),
    avgRating: numeric('avg_rating', { precision: 4, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('breeders_published_name_idx').on(t.published, t.name),
    index('breeders_slug_idx').on(t.slug),
  ],
);

/** Cultivars (catalog). */
export const strains = pgTable(
  'strains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    breederId: uuid('breeder_id').references(() => breeders.id, {
      onDelete: 'set null',
    }),
    /** Tag list, e.g. effect labels */
    effects: jsonb('effects')
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    effectsNotes: text('effects_notes'),
    published: boolean('published').notNull().default(true),
    reviewCount: integer('review_count').notNull().default(0),
    avgRating: numeric('avg_rating', { precision: 4, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('strains_published_name_idx').on(t.published, t.name),
    index('strains_breeder_idx').on(t.breederId),
    index('strains_slug_idx').on(t.slug),
  ],
);

export const breederReviews = pgTable(
  'breeder_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    breederId: uuid('breeder_id')
      .notNull()
      .references(() => breeders.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull(),
    body: text('body').notNull().default(''),
    subRatings: jsonb('sub_ratings')
      .notNull()
      .$type<CatalogReviewSubRatings>()
      .default(sql`'{}'::jsonb`),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenBy: uuid('hidden_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    hiddenReason: text('hidden_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('breeder_reviews_breeder_author_uq').on(t.breederId, t.authorId),
    index('breeder_reviews_breeder_idx').on(t.breederId),
    check(
      'breeder_reviews_rating_range',
      sql`${t.rating} >= 1 AND ${t.rating} <= 5`,
    ),
  ],
);

export const strainReviews = pgTable(
  'strain_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strainId: uuid('strain_id')
      .notNull()
      .references(() => strains.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull(),
    body: text('body').notNull().default(''),
    subRatings: jsonb('sub_ratings')
      .notNull()
      .$type<CatalogReviewSubRatings>()
      .default(sql`'{}'::jsonb`),
    media: jsonb('media')
      .notNull()
      .$type<PostMediaItem[]>()
      .default(sql`'[]'::jsonb`),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenBy: uuid('hidden_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    hiddenReason: text('hidden_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('strain_reviews_strain_author_uq').on(t.strainId, t.authorId),
    index('strain_reviews_strain_idx').on(t.strainId),
    check(
      'strain_reviews_rating_range',
      sql`${t.rating} >= 1 AND ${t.rating} <= 5`,
    ),
  ],
);

export const catalogSuggestions = pgTable(
  'catalog_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: catalogSuggestionKindEnum('kind').notNull(),
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    suggestedBy: uuid('suggested_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: catalogSuggestionStatusEnum('status').notNull().default('pending'),
    rejectReason: text('reject_reason'),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderatedBy: uuid('moderated_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('catalog_suggestions_status_created_idx').on(t.status, t.createdAt),
    index('catalog_suggestions_suggested_by_idx').on(t.suggestedBy),
  ],
);

/** Direct message thread between two profiles (canonical ordering user_low < user_high). */
export const dmThreads = pgTable(
  'dm_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userLow: uuid('user_low')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    userHigh: uuid('user_high')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('dm_threads_pair_uq').on(t.userLow, t.userHigh),
    check('dm_threads_order_chk', sql`${t.userLow} < ${t.userHigh}`),
    index('dm_threads_last_msg_idx').on(t.lastMessageAt),
  ],
);

export const dmMessages = pgTable(
  'dm_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => dmThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    /** Public https URL in `post-media` bucket (set with optional caption in `body`). */
    imageUrl: text('image_url'),
    /** Ordered public `post-media` URLs; mirrors first entry in `image_url` for thread preview SQL. */
    imageUrls: jsonb('image_urls')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('dm_messages_thread_created_idx').on(t.threadId, t.createdAt),
  ],
);

export const dmThreadReads = pgTable(
  'dm_thread_reads',
  {
    threadId: uuid('thread_id')
      .notNull()
      .references(() => dmThreads.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.profileId] }),
  ],
);

/** Grow diary (NOTEBOOK) — one run per cultivar / grow. */
export const notebooks = pgTable(
  'notebooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    strainId: uuid('strain_id').references(() => strains.id, {
      onDelete: 'set null',
    }),
    /** Free-text strain label when not linked to catalog or as display override. */
    customStrainLabel: text('custom_strain_label'),
    title: text('title').notNull(),
    status: notebookStatusEnum('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    plantCount: integer('plant_count'),
    totalLightWatts: numeric('total_light_watts', {
      precision: 12,
      scale: 2,
    }),
    harvestDryWeightG: numeric('harvest_dry_weight_g', {
      precision: 12,
      scale: 3,
    }),
    harvestQualityNotes: text('harvest_quality_notes'),
    roomType: notebookRoomTypeEnum('room_type'),
    wateringType: notebookWateringTypeEnum('watering_type'),
    startType: notebookStartTypeEnum('start_type'),
    /** Tent, lights, medium, etc. */
    setupNotes: text('setup_notes'),
    /** When null (and notebook is new enough), owner edit shows first-run setup wizard. */
    setupWizardCompletedAt: timestamp('setup_wizard_completed_at', {
      withTimezone: true,
    }),
    /** Env readings: Celsius vs Fahrenheit for this diary (UI converts). */
    preferredTempUnit: varchar('preferred_temp_unit', { length: 1 })
      .notNull()
      .default('C'),
    /** Feed/water volume: liters vs US gallons for display & entry. */
    preferredVolumeUnit: varchar('preferred_volume_unit', { length: 3 })
      .notNull()
      .default('L'),
    /** Photoperiod during vegetation (e.g. 18/6), notebook-level. */
    vegLightCycle: text('veg_light_cycle'),
    /** Photoperiod during flower (e.g. 12/12), notebook-level. */
    flowerLightCycle: text('flower_light_cycle'),
    growthStage: notebookGrowthStageEnum('growth_stage')
      .notNull()
      .default('germination'),
    /** Max week index when leaving germination; veg weeks have week_index > this. */
    vegPhaseStartedAfterWeekIndex: integer(
      'veg_phase_started_after_week_index',
    ),
    /** Max week index when leaving vegetation; flower weeks have week_index > this. */
    flowerPhaseStartedAfterWeekIndex: integer(
      'flower_phase_started_after_week_index',
    ),
    harvestImageUrls: jsonb('harvest_image_urls')
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    /** Derived on save: harvest_dry_weight_g / total_light_watts */
    gPerWatt: numeric('g_per_watt', { precision: 14, scale: 6 }),
    /** Derived: g_per_watt / plant_count when both set */
    gPerWattPerPlant: numeric('g_per_watt_per_plant', {
      precision: 14,
      scale: 6,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('notebooks_owner_updated_idx').on(t.ownerId, t.updatedAt),
    index('notebooks_strain_idx').on(t.strainId),
  ],
);

export const notebookWeeks = pgTable(
  'notebook_weeks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notebookId: uuid('notebook_id')
      .notNull()
      .references(() => notebooks.id, { onDelete: 'cascade' }),
    weekIndex: integer('week_index').notNull(),
    /** Up to three mid-week updates; each { body, at } with ISO `at`. Legacy `notes` may still exist. */
    noteEntries: jsonb('note_entries')
      .notNull()
      .$type<{ body: string; at: string }[]>()
      .default(sql`'[]'::jsonb`),
    notes: text('notes'),
    tempC: numeric('temp_c', { precision: 6, scale: 2 }),
    humidityPct: numeric('humidity_pct', { precision: 6, scale: 2 }),
    ph: numeric('ph', { precision: 5, scale: 2 }),
    ec: numeric('ec', { precision: 8, scale: 3 }),
    /** Optional TDS / ppm if tracked separately from EC. */
    ppm: varchar('ppm', { length: 32 }),
    /** How much / how often you watered, feed timing, etc. */
    waterNotes: text('water_notes'),
    /** Total feed/water volume for the week, stored in liters (UI converts by notebook pref). */
    waterVolumeLiters: numeric('water_volume_liters', {
      precision: 12,
      scale: 3,
    }),
    lightCycle: text('light_cycle'),
    imageUrls: jsonb('image_urls')
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('notebook_weeks_notebook_week_uq').on(t.notebookId, t.weekIndex),
    index('notebook_weeks_notebook_idx').on(t.notebookId),
  ],
);

export const nutrientProducts = pgTable(
  'nutrient_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    brand: text('brand'),
    npk: text('npk'),
    published: boolean('published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('nutrient_products_published_name_idx').on(t.published, t.name),
  ],
);

export const notebookWeekNutrients = pgTable(
  'notebook_week_nutrients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    weekId: uuid('week_id')
      .notNull()
      .references(() => notebookWeeks.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => nutrientProducts.id, {
      onDelete: 'set null',
    }),
    customLabel: text('custom_label'),
    dosage: text('dosage'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('notebook_week_nutrients_week_idx').on(t.weekId),
  ],
);

export const notebookVotes = pgTable(
  'notebook_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    notebookId: uuid('notebook_id')
      .notNull()
      .references(() => notebooks.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.notebookId] }),
    index('notebook_votes_notebook_idx').on(t.notebookId),
  ],
);

export const notebookComments = pgTable(
  'notebook_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notebookId: uuid('notebook_id')
      .notNull()
      .references(() => notebooks.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => notebookComments.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
    imageUrls: jsonb('image_urls')
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('notebook_comments_notebook_created_idx').on(t.notebookId, t.createdAt),
    index('notebook_comments_parent_idx').on(t.parentId),
  ],
);
