const { config } = require("dotenv");
const { resolve } = require("path");
const postgres = require("postgres");

config({ path: resolve(__dirname, "..", ".env") });
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: /supabase\.co|pooler\.supabase\.com/i.test(url) ? "require" : undefined,
});

(async () => {
  try {
    let inPublic = [];
    let inDrizzle = [];
    try {
      inPublic = await sql`
        select id, hash, created_at
        from public."__drizzle_migrations"
        order by created_at
      `;
    } catch {
      /* no public journal */
    }
    try {
      inDrizzle = await sql`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at
      `;
    } catch {
      /* no drizzle schema journal */
    }
    console.log("migrations @ public.__drizzle_migrations:", inPublic.length, inPublic);
    console.log("migrations @ drizzle.__drizzle_migrations:", inDrizzle.length, inDrizzle);

    const postIdCol = await sql`
      select is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = 'comment_votes' and column_name = 'post_id'
    `;
    console.log("comment_votes.post_id column:", postIdCol);

    const follows = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('user_follows', 'community_follows')
      order by table_name
    `;
    console.log("follow tables:", follows);

    const publicTables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;
    console.log(
      "public tables:",
      publicTables.map((r) => r.table_name).join(", "),
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
})();
