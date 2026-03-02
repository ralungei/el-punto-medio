/**
 * export.ts — Export SQLite data to static JSON for panorama-web
 *
 * Reusable functions called from:
 *   - synthesize.ts (exportArticle after each cluster)
 *   - pipeline.ts (exportEditionIndex at the end)
 *   - scripts/export-web.ts (standalone full export)
 *
 * In production (CI), the Worker serves data directly from D1.
 * Export is only used for local development.
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getEditionArticles,
  getArticleBySlug,
  getClusterSources,
  getAllEditions,
  getAllSources,
  type ArticleWithMeta,
} from "./queries";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "..", "frontend", "public", "data");

/** Parse sections JSON, handling nested stringified fields (coverage, questions) */
export function parseSections(raw: string): Record<string, unknown> {
  const s = JSON.parse(raw);

  // coverage: Claude returns stringified JSON array of CoverageSource[]
  if (typeof s.coverage === "string") {
    try { s.coverage = JSON.parse(s.coverage); } catch { /* keep as string */ }
  }

  // questions: Claude may return stringified JSON — either string[] or { questions: string[] }
  if (typeof s.questions === "string") {
    try {
      const parsed = JSON.parse(s.questions);
      s.questions = Array.isArray(parsed) ? parsed : parsed?.questions ?? [];
    } catch {
      // plain string — split by newlines as fallback
      s.questions = s.questions.split("\n").filter((q: string) => q.trim());
    }
  }

  // Strip leading numbering/bullets from questions (UI adds its own)
  if (Array.isArray(s.questions)) {
    s.questions = s.questions
      .map((q: string) => q.replace(/^\s*(?:\d+[.)]\s*|-\s*|•\s*)/, "").trim())
      .filter((q: string) => q.length > 0);
  }

  return s;
}

function ensureDir() {
  mkdirSync(OUT_DIR, { recursive: true });
}

function write(name: string, data: unknown) {
  ensureDir();
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`  ⤷ export: ${name}`);
}

/**
 * Editorial scoring: decide article prominence for an edition.
 */
export function scoreArticles(articles: ArticleWithMeta[]) {
  const scored = articles.map((a) => ({
    ...a,
    _score: a.sourcesCount * 10 + (a.imageUrl ? 5 : 0) + (a.categories.length > 1 ? 3 : 0),
  }));
  scored.sort((a, b) => b._score - a._score);

  // Ensure #1 has an image (swap with first that has one)
  if (!scored[0]?.imageUrl) {
    const withImg = scored.findIndex((a) => a.imageUrl);
    if (withImg > 0) {
      [scored[0], scored[withImg]] = [scored[withImg], scored[0]];
    }
  }

  // Deduplicate consecutive same-primary-category in top 6
  for (let i = 1; i < Math.min(6, scored.length); i++) {
    const prevPrimary = scored[i - 1].categories[0] || scored[i - 1].category;
    const currPrimary = scored[i].categories[0] || scored[i].category;
    if (currPrimary === prevPrimary) {
      const swap = scored.slice(i + 1).findIndex((a) => {
        const p = a.categories[0] || a.category;
        return p !== currPrimary;
      });
      if (swap >= 0) {
        const swapIdx = i + 1 + swap;
        [scored[i], scored[swapIdx]] = [scored[swapIdx], scored[i]];
      }
    }
  }

  return scored;
}

/**
 * Export a single article JSON by slug.
 * Called progressively after each synthesizeCluster success.
 */
export async function exportArticle(slug: string): Promise<void> {
  const sources = await getAllSources();
  const full = await getArticleBySlug(slug);
  if (!full) return;

  const sections = parseSections(full.sections);
  const clusterSources = await getClusterSources(full.clusterId);

  write(`article-${slug}.json`, {
    ...full,
    sections,
    clusterSources: clusterSources.map((cs: Record<string, unknown>) => ({
      id: cs.id,
      title: cs.title,
      url: cs.url,
      publishedAt: (cs.publishedAt as string) ?? null,
      sourceId: cs.sourceId,
      source: cs.source
        ? {
            id: (cs.source as Record<string, unknown>).id,
            name: (cs.source as Record<string, unknown>).name,
            politicalLean: (cs.source as Record<string, unknown>).politicalLean,
          }
        : null,
    })),
    allSources: sources.map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      politicalLean: s.politicalLean,
    })),
  });
}

/**
 * Export all edition-level files: editions.json, edition-{id}.json, sources.json,
 * and all article JSONs for the given edition.
 */
export async function exportEditionIndex(editionId: number): Promise<void> {
  const sources = await getAllSources();
  write("sources.json", sources);

  // editions.json — all published editions with article previews
  const editions = await getAllEditions();
  const editionsWithArticles = [];
  for (const e of editions) {
    const arts = await getEditionArticles(e.id);
    editionsWithArticles.push({
      ...e,
      articles: arts
        .slice(0, 4)
        .map((a) => ({
          id: a.id,
          slug: a.slug,
          headline: a.headline,
          imageUrl: a.imageUrl,
          images: a.images,
          sourcesCount: a.sourcesCount,
          category: a.category,
          categories: a.categories,
        })),
    });
  }
  write("editions.json", editionsWithArticles);

  // edition-{id}.json — scored articles for this edition
  const articles = await getEditionArticles(editionId);
  const scored = scoreArticles(articles);

  write(`edition-${editionId}.json`, {
    edition: editions.find((e: { id: number }) => e.id === editionId),
    articles: scored.map(({ _score, ...a }) => ({
      id: a.id,
      slug: a.slug,
      headline: a.headline,
      summary: a.summary,
      category: a.category,
      categories: a.categories,
      imageUrl: a.imageUrl,
      images: a.images,
      sentiment: a.sentiment ?? null,
      sourcesCount: a.sourcesCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      editionType: a.editionType,
    })),
  });

  // All article JSONs for this edition
  for (const article of articles) {
    await exportArticle(article.slug);
  }

  console.log(`  ✓ Exported edition #${editionId}: ${articles.length} articles`);
}
