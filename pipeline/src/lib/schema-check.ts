import { sql } from "drizzle-orm";
import { db } from "./db.js";

interface SchemaCheckResult {
  valid: boolean;
  errors: string[];
}

/** Critical columns per table that the pipeline writes to. */
const EXPECTED_COLUMNS: Record<string, string[]> = {
  sources: ["id", "name", "url", "political_lean", "active"],
  editions: ["id", "type", "status", "article_count"],
  raw_articles: ["id", "source_id", "edition_id", "title", "url", "content"],
  clusters: ["id", "edition_id", "topic_summary", "category", "categories", "analysis_hash"],
  cluster_articles: ["cluster_id", "raw_article_id"],
  source_analyses: ["id", "cluster_id", "source_id", "tone", "framing", "emphasis", "omissions", "raw_json"],
  articles: ["id", "cluster_id", "edition_id", "slug", "headline", "summary", "sections", "category", "categories", "sentiment", "sources_count", "synthesis_hash"],
};

/** Unique indexes required for onConflictDoUpdate and deduplication. */
const EXPECTED_INDEXES = [
  "raw_articles_url_unique",
  "articles_slug_unique",
  "source_analyses_cluster_source_idx",
];

/**
 * Validates DB schema matches what the pipeline expects.
 * Runs cheap PRAGMA/sqlite_master queries — no API calls, no cost.
 */
export async function validateSchema(): Promise<SchemaCheckResult> {
  const errors: string[] = [];

  // 1. Check tables exist
  const tables: { name: string }[] = await db.all(
    sql`SELECT name FROM sqlite_master WHERE type='table'`
  );
  const tableNames = new Set(tables.map((t) => t.name));

  for (const table of Object.keys(EXPECTED_COLUMNS)) {
    if (!tableNames.has(table)) {
      errors.push(`Missing table: ${table}`);
      continue;
    }

    // 2. Check critical columns exist
    const columns: { name: string }[] = await db.all(
      sql.raw(`PRAGMA table_info('${table}')`)
    );
    const colNames = new Set(columns.map((c) => c.name));

    for (const col of EXPECTED_COLUMNS[table]) {
      if (!colNames.has(col)) {
        errors.push(`Missing column: ${table}.${col}`);
      }
    }
  }

  // 3. Check unique indexes exist
  const indexes: { name: string }[] = await db.all(
    sql`SELECT name FROM sqlite_master WHERE type='index'`
  );
  const indexNames = new Set(indexes.map((i) => i.name));

  for (const idx of EXPECTED_INDEXES) {
    if (!indexNames.has(idx)) {
      errors.push(`Missing index: ${idx}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
