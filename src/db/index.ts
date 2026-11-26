/**
 * Database client.
 *
 * - Production / Vercel: Neon serverless Postgres over HTTP (DATABASE_URL).
 * - Local dev without DATABASE_URL: an on-disk PGlite database in ./.pglite,
 *   migrated automatically on first use. Lets you try the app with zero setup.
 */
import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __hisabDb?: Promise<DB> };

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as DB;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
    throw new Error("DATABASE_URL is not set. See README → Environment variables.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite("./.pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as DB;
}

/** Returns the shared Drizzle instance (created lazily once per server process). */
export function getDb(): Promise<DB> {
  if (!globalForDb.__hisabDb) globalForDb.__hisabDb = createDb();
  return globalForDb.__hisabDb;
}

export { schema };
