import * as schema from "../../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let db: any;
export { schema };

/**
 * Initialize the database connection.
 * - If CF_D1_TOKEN is set: connect to Cloudflare D1 via HTTP (production / CI)
 * - Otherwise: use local SQLite via better-sqlite3 (development)
 */
export async function initDb() {
  if (process.env.CF_D1_TOKEN) {
    const { createD1HttpAdapter } = await import("./d1-http.js");
    const { drizzle } = await import("drizzle-orm/d1");

    const d1 = createD1HttpAdapter(
      process.env.CF_ACCOUNT_ID!,
      process.env.CF_D1_DATABASE_ID!,
      process.env.CF_D1_TOKEN!
    );

    db = drizzle(d1 as never, { schema });
    console.log("  DB: Cloudflare D1 (HTTP)");
  } else {
    const { default: Database } = await import("better-sqlite3");
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dbPath = join(__dirname, "..", "..", "data", "panorama.db");

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    db = drizzle(sqlite, { schema });
    console.log("  DB: SQLite (local)");
  }
}
