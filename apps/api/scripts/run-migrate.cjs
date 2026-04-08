/**
 * Applies Drizzle migrations using the postgres-js migrator (not drizzle-kit CLI).
 * drizzle-kit migrate can exit 1 on Supabase/Render when harmless NOTICEs are emitted
 * for CREATE SCHEMA IF NOT EXISTS / CREATE TABLE IF NOT EXISTS on __drizzle_migrations.
 * The postgres client here uses onnotice: () => {} so notices do not fail the run.
 */
const { existsSync } = require("fs");
const { config } = require("dotenv");
const { resolve } = require("path");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");

const apiRoot = resolve(__dirname, "..");
for (const p of [
  resolve(apiRoot, "..", "..", ".env"),
  resolve(apiRoot, "..", "..", ".env.local"),
  resolve(apiRoot, ".env"),
  resolve(apiRoot, ".env.local"),
]) {
  if (existsSync(p)) config({ path: p, override: true });
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "db:migrate: DATABASE_URL is not set. Add it to apps/api/.env (see apps/api/.env.example).",
  );
  process.exit(1);
}

function hostnameFromDatabaseUrl(connUrl) {
  try {
    const u = new URL(connUrl.replace(/^postgres(ql)?:/i, "http:"));
    return u.hostname || "";
  } catch {
    return "";
  }
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 25,
  ssl: /supabase\.co|pooler\.supabase\.com/i.test(url) ? "require" : undefined,
  onnotice: () => {},
});

async function syncDrizzleMigrationsIdSequence(dbSql) {
  await dbSql.unsafe(`
DO $sync$
DECLARE
  m bigint;
  seq text;
BEGIN
  IF to_regclass('public.__drizzle_migrations') IS NULL THEN
    RETURN;
  END IF;
  SELECT MAX(id) INTO m FROM public.__drizzle_migrations;
  IF m IS NULL THEN
    RETURN;
  END IF;
  seq := pg_get_serial_sequence('public.__drizzle_migrations', 'id');
  IF seq IS NOT NULL THEN
    PERFORM setval(seq::regclass, m);
  END IF;
END $sync$;
`);
}

(async () => {
  try {
    await sql`select 1`;
    await syncDrizzleMigrationsIdSequence(sql);
    console.log("db:migrate: Postgres reachable, applying migrations …");
    const db = drizzle(sql);
    await migrate(db, {
      migrationsFolder: resolve(apiRoot, "drizzle"),
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "public",
    });
    console.log("db:migrate: done.");
  } catch (e) {
    console.error("db:migrate: failed:", e.message);
    const c = e && e.cause;
    if (c) console.error("  cause:", c instanceof Error ? c.message : c);
    const msg = String(e.message);
    if (/ENOTFOUND|getaddrinfo|ECONNREFUSED|ETIMEDOUT/i.test(msg)) {
      const host = hostnameFromDatabaseUrl(url);
      if (/ENOTFOUND|getaddrinfo/i.test(msg)) {
        console.error(
          "  → DNS could not resolve the database host (not a wrong password).",
        );
        if (host) console.error(`     Try: nslookup ${host}`);
        console.error(
          "     Fix: working internet, DNS (e.g. 8.8.8.8), disable VPN/proxy if needed.",
        );
        console.error(
          "     Confirm the project is active: Supabase Dashboard → project not paused.",
        );
      } else {
        console.error(
          "  → Network/firewall or wrong host/port. For Supabase, copy the connection string",
        );
        console.error(
          "     from Dashboard → Project Settings → Database (URI).",
        );
      }
    } else if (/28P01|password authentication failed/i.test(msg)) {
      console.error(
        "  → Wrong database password. Reset in Supabase → Database → reset password, URL-encode special chars in DATABASE_URL.",
      );
    } else if (/tenant or user not found/i.test(msg)) {
      console.error(
        "  → Pooler rejected the login. Open Supabase → Connect → Session pooler and paste the FULL URI into DATABASE_URL.",
      );
      console.error(
        "     Username must be postgres.<project-ref> (not just postgres). Reset DB password if unsure. Encode ! as %21 in the password.",
      );
    } else {
      console.error(
        "  Also check: URL-encoded password in DATABASE_URL, ?sslmode=require, VPN/DNS.",
      );
    }
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
})();
