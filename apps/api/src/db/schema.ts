import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['member', 'moderator', 'admin']);

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
  role: roleEnum('role').notNull().default('member'),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Attachments for a post (URLs to bucket objects or external https assets). */
export type PostMediaItem = { url: string; type: 'image' | 'video' };

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
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

export const userNotifications = pgTable(
  'user_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
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
