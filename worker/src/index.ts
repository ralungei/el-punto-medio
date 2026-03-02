import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, inArray } from "drizzle-orm";
import * as schema from "../../pipeline/db/schema";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for Pages domain
app.use(
  "*",
  cors({
    origin: [
      "https://el-punto-medio.pages.dev",
      "http://localhost:5173",
      "http://localhost:4173",
    ],
  })
);

// Cache headers middleware
app.use("*", async (c, next) => {
  await next();
  if (c.res.ok) {
    c.res.headers.set("Cache-Control", "public, s-maxage=3600, max-age=300");
  }
});

// ── Helpers ──

/** Parse sections JSON, handling nested stringified fields */
function parseSections(raw: string): Record<string, unknown> {
  const s = JSON.parse(raw);

  if (typeof s.coverage === "string") {
    try { s.coverage = JSON.parse(s.coverage); } catch { /* keep */ }
  }

  if (typeof s.questions === "string") {
    try {
      const parsed = JSON.parse(s.questions);
      s.questions = Array.isArray(parsed) ? parsed : parsed?.questions ?? [];
    } catch {
      s.questions = s.questions.split("\n").filter((q: string) => q.trim());
    }
  }

  if (Array.isArray(s.questions)) {
    s.questions = s.questions
      .map((q: string) => q.replace(/^\s*(?:\d+[.)]\s*|-\s*|•\s*)/, "").trim())
      .filter((q: string) => q.length > 0);
  }

  return s;
}

/** Score articles for editorial prominence */
function scoreArticles(
  articles: {
    sourcesCount: number;
    imageUrl: string | null;
    categories: string[];
    category: string | null;
  }[]
) {
  const scored = articles.map((a) => ({
    ...a,
    _score:
      a.sourcesCount * 10 +
      (a.imageUrl ? 5 : 0) +
      (a.categories.length > 1 ? 3 : 0),
  }));
  scored.sort((a, b) => b._score - a._score);

  if (scored[0] && !scored[0].imageUrl) {
    const withImg = scored.findIndex((a) => a.imageUrl);
    if (withImg > 0) {
      [scored[0], scored[withImg]] = [scored[withImg], scored[0]];
    }
  }

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

/** Get image candidates for a cluster */
async function getClusterImages(db: ReturnType<typeof drizzle>, clusterId: number) {
  const links = await db
    .select()
    .from(schema.clusterArticles)
    .where(eq(schema.clusterArticles.clusterId, clusterId))
    .all();

  const rawIds = links.map((l) => l.rawArticleId);
  if (rawIds.length === 0) return [];

  const rawArticles = await db
    .select({
      imageUrl: schema.rawArticles.imageUrl,
      sourceName: schema.sources.name,
    })
    .from(schema.rawArticles)
    .innerJoin(
      schema.sources,
      eq(schema.rawArticles.sourceId, schema.sources.id)
    )
    .where(inArray(schema.rawArticles.id, rawIds))
    .all();

  const seen = new Set<string>();
  const images: { url: string; source: string }[] = [];

  for (const raw of rawArticles) {
    if (raw.imageUrl && !seen.has(raw.imageUrl)) {
      seen.add(raw.imageUrl);
      images.push({
        url: raw.imageUrl,
        source: raw.sourceName || "Desconocido",
      });
    }
  }

  return images;
}

/** Get articles for an edition, enriched with images and categories */
async function getEditionArticles(db: ReturnType<typeof drizzle>, editionId: number) {
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

  const result = [];
  for (const { clusterId, categoriesRaw, ...row } of rows) {
    const images = await getClusterImages(db, clusterId);
    const categories: string[] = categoriesRaw
      ? JSON.parse(categoriesRaw)
      : row.category
        ? [row.category]
        : [];
    result.push({
      ...row,
      categories,
      imageUrl: row.imageUrl || images[0]?.url || null,
      images,
    });
  }

  return result;
}

// ── Routes ──

// GET /sources.json
app.get("/sources.json", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const sources = await db.select().from(schema.sources).all();
  return c.json(sources);
});

// GET /editions.json
app.get("/editions.json", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const editions = await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.status, "published"))
    .orderBy(desc(schema.editions.publishedAt))
    .limit(30)
    .all();

  const result = [];
  for (const e of editions) {
    const arts = await getEditionArticles(db, e.id);
    result.push({
      ...e,
      articles: arts.slice(0, 4).map((a) => ({
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

  return c.json(result);
});

// GET /edition-:id.json
app.get("/edition-:id.json", async (c) => {
  const editionId = parseInt(c.req.param("id"));
  if (isNaN(editionId)) return c.json({ error: "Invalid edition ID" }, 400);

  const db = drizzle(c.env.DB, { schema });

  const edition = await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.id, editionId))
    .get();

  if (!edition) return c.json({ error: "Edition not found" }, 404);

  const articles = await getEditionArticles(db, editionId);
  const scored = scoreArticles(articles);

  return c.json({
    edition,
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
});

// GET /article-:slug.json
app.get("/article-:slug.json", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB, { schema });

  const article = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.slug, slug))
    .get();

  if (!article) return c.json({ error: "Article not found" }, 404);

  const images = await getClusterImages(db, article.clusterId);
  const categories: string[] = article.categories
    ? JSON.parse(article.categories)
    : article.category
      ? [article.category]
      : [];
  const sections = parseSections(article.sections);

  // Get cluster sources
  const clusterLinks = await db
    .select()
    .from(schema.clusterArticles)
    .where(eq(schema.clusterArticles.clusterId, article.clusterId))
    .all();

  const rawIds = clusterLinks.map((l) => l.rawArticleId);
  const allSources = await db.select().from(schema.sources).all();
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));

  let clusterSources: {
    id: number;
    title: string;
    url: string;
    publishedAt: string | null;
    sourceId: number;
    source: { id: number; name: string; politicalLean: string } | null;
  }[] = [];

  if (rawIds.length > 0) {
    const rawArticles = await db
      .select()
      .from(schema.rawArticles)
      .where(inArray(schema.rawArticles.id, rawIds))
      .all();

    clusterSources = rawArticles.map((a) => {
      const source = sourceMap.get(a.sourceId);
      return {
        id: a.id,
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt ?? null,
        sourceId: a.sourceId,
        source: source
          ? {
              id: source.id,
              name: source.name,
              politicalLean: source.politicalLean,
            }
          : null,
      };
    });
  }

  return c.json({
    ...article,
    categories,
    imageUrl: article.imageUrl || images[0]?.url || null,
    images,
    sections,
    clusterSources,
    allSources: allSources.map((s) => ({
      id: s.id,
      name: s.name,
      politicalLean: s.politicalLean,
    })),
  });
});

export default app;
