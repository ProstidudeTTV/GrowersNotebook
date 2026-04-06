/**
 * Seeds score: one number from all engagement on a grower's content.
 *
 * - Post votes: each upvote (+1) / downvote (−1) is weighted more than comments
 *   (posts take more effort and carry more visibility).
 * - Comment votes: same ±1 tally, lower multiplier so threads reward consistency
 *   without overpowering solid posts.
 *
 * Formula: seeds = postMult * Σ(post_votes.value) + commentMult * Σ(comment_votes.value)
 * Values are already +1 / −1 in the database.
 */
export const POST_VOTE_SEED_WEIGHT = 2;
export const COMMENT_VOTE_SEED_WEIGHT = 1;

export function seedsFromVoteTotals(
  postNetVotes: number,
  commentNetVotes: number,
): number {
  return Math.round(
    POST_VOTE_SEED_WEIGHT * postNetVotes +
      COMMENT_VOTE_SEED_WEIGHT * commentNetVotes,
  );
}

/** Ordered by `minSeeds` ascending; use last tier where seeds >= minSeeds. */
export const SEED_TIERS: readonly { readonly minSeeds: number; readonly title: string }[] =
  [
    { minSeeds: 0, title: 'Rookie Grower' },
    { minSeeds: 25, title: 'Apprentice Grower' },
    { minSeeds: 100, title: 'Home Grower' },
    { minSeeds: 300, title: 'Dedicated Grower' },
    { minSeeds: 800, title: 'Veteran Grower' },
    { minSeeds: 2000, title: 'Master Grower' },
    { minSeeds: 5000, title: 'Legacy Gardener' },
  ] as const;

/** Rank title for a seeds total (grower progression). */
export function growerRankFromSeeds(seeds: number): string {
  const s = Number(seeds);
  let title = SEED_TIERS[0]!.title;
  for (const tier of SEED_TIERS) {
    if (Number.isFinite(s) && s >= tier.minSeeds) title = tier.title;
  }
  return title;
}
