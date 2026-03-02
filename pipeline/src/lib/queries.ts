import { db, schema } from "./db";
import { eq, desc, inArray } from "drizzle-orm";

export interface CarouselImage {
  url: string;
  source: string;
}

export interface ArticleWithMeta {
  id: number;
  slug: string;
  headline: string;
  summary: string | null;
  sections: string;
  sentiment: string | null;
  category: string | null;
  categories: string[];
  imageUrl: string | null;
  images: CarouselImage[];
  sourcesCount: number;
  createdAt: string;
  updatedAt: string | null;
  editionType: string;
}

export async function getLatestEdition() {
  return await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.status, "published"))
    .orderBy(desc(schema.editions.publishedAt))
    .limit(1)
    .get();
}

export async function getEditionArticles(editionId: number): Promise<ArticleWithMeta[]> {
  const rows = await db
    .select({
      id: schema.articles.id,
      slug: schema.articles.slug,
      headline: schema.articles.headline,
      summary: schema.articles.summary,
      sections: schema.articles.sections,
      sentiment: schema.articles.sentiment,
      category: schema.articles.category,
      categoriesRaw: schema.articles.categories,
      imageUrl: schema.articles.imageUrl,
      sourcesCount: schema.articles.sourcesCount,
      createdAt: schema.articles.createdAt,
      updatedAt: schema.articles.updatedAt,
      editionType: schema.editions.type,
      clusterId: schema.articles.clusterId,
    })
    .from(schema.articles)
    .innerJoin(
      schema.editions,
      eq(schema.articles.editionId, schema.editions.id)
    )
    .where(eq(schema.articles.editionId, editionId))
    .orderBy(desc(schema.articles.sourcesCount))
    .all();

  const result: ArticleWithMeta[] = [];
  for (const { clusterId, categoriesRaw, ...row } of rows) {
    const images = await getClusterImageCandidates(clusterId);
    const categories: string[] = categoriesRaw
      ? JSON.parse(categoriesRaw)
      : row.category ? [row.category] : [];
    result.push({
      ...row,
      categories,
      imageUrl: row.imageUrl || images[0]?.url || null,
      images,
    });
  }
  return result;
}

/**
 * Collect image URLs from a cluster's raw articles, tagged with source name.
 * Uses imageUrl (og:image from scrape, or homepage thumbnail as fallback).
 * Deduplicates by URL.
 */
async function getClusterImageCandidates(clusterId: number): Promise<CarouselImage[]> {
  const clusterLinks = await db
    .select()
    .from(schema.clusterArticles)
    .where(eq(schema.clusterArticles.clusterId, clusterId))
    .all();

  const rawIds = clusterLinks.map((l: { rawArticleId: number }) => l.rawArticleId);
  if (rawIds.length === 0) return [];

  const rawArticles = await db
    .select({
      imageUrl: schema.rawArticles.imageUrl,
      sourceName: schema.sources.name,
    })
    .from(schema.rawArticles)
    .innerJoin(schema.sources, eq(schema.rawArticles.sourceId, schema.sources.id))
    .where(inArray(schema.rawArticles.id, rawIds))
    .all();

  const seen = new Set<string>();
  const candidates: CarouselImage[] = [];

  for (const raw of rawArticles) {
    if (raw.imageUrl && !seen.has(raw.imageUrl)) {
      seen.add(raw.imageUrl);
      candidates.push({ url: raw.imageUrl, source: raw.sourceName || "Desconocido" });
    }
  }

  return candidates;
}

export async function getArticleBySlug(slug: string) {
  const article = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.slug, slug))
    .get();

  if (!article) return null;

  const images = await getClusterImageCandidates(article.clusterId);
  const categories: string[] = article.categories
    ? JSON.parse(article.categories)
    : article.category ? [article.category] : [];

  return {
    ...article,
    categories,
    imageUrl: article.imageUrl || images[0]?.url || null,
    images,
  };
}

export async function getClusterSources(clusterId: number) {
  const clusterArticleLinks = await db
    .select()
    .from(schema.clusterArticles)
    .where(eq(schema.clusterArticles.clusterId, clusterId))
    .all();

  const rawArticleIds = clusterArticleLinks.map((ca: { rawArticleId: number }) => ca.rawArticleId);
  if (rawArticleIds.length === 0) return [];

  const allSources = await db.select().from(schema.sources).all();
  const sourceMap = new Map(allSources.map((s: { id: number }) => [s.id, s]));

  const rawArticles = await db
    .select()
    .from(schema.rawArticles)
    .where(inArray(schema.rawArticles.id, rawArticleIds))
    .all();

  return rawArticles.map((a: { sourceId: number }) => ({
    ...a,
    source: sourceMap.get(a.sourceId),
  }));
}

export async function getAllEditions() {
  return await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.status, "published"))
    .orderBy(desc(schema.editions.publishedAt))
    .limit(30)
    .all();
}

export async function getAllSources() {
  return await db.select().from(schema.sources).all();
}
