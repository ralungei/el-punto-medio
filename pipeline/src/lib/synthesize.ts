import { llm } from "./usage";
import { db, schema } from "./db";
import { eq, desc } from "drizzle-orm";
import { synthesisPrompt, slugify, SYSTEM_PROMPT } from "./prompts";
import { runConcurrent, batchSelect } from "./concurrent";
import { exportArticle } from "./export";

const isCI = !!process.env.CF_D1_TOKEN;

const SYNTHESIS_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string" as const },
    summary: { type: "string" as const },
    categories: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    facts: { type: "string" as const },
    coverage: { type: "string" as const },
    hidden: { type: "string" as const },
    context: { type: "string" as const },
    questions: { type: "string" as const },
    sentiment: { type: "string" as const },
    related_slugs: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: [
    "headline",
    "summary",
    "categories",
    "facts",
    "coverage",
    "hidden",
    "context",
    "questions",
    "sentiment",
  ] as const,
  additionalProperties: false as const,
};

export async function synthesizeCluster(
  clusterId: number,
  editionId: number,
  isEnrichment: boolean = false
): Promise<string | null> {
  const cluster = await db
    .select()
    .from(schema.clusters)
    .where(eq(schema.clusters.id, clusterId))
    .get();

  if (!cluster) return null;

  // Get source analyses
  const analyses = await db
    .select()
    .from(schema.sourceAnalyses)
    .where(eq(schema.sourceAnalyses.clusterId, clusterId))
    .all();

  if (analyses.length < 2) return null;

  // Get raw articles for context
  const clusterArticleLinks = await db
    .select()
    .from(schema.clusterArticles)
    .where(eq(schema.clusterArticles.clusterId, clusterId))
    .all();

  const rawArticles = await batchSelect(
    (cond) => db.select().from(schema.rawArticles).where(cond).all(),
    schema.rawArticles.id,
    clusterArticleLinks.map((ca: { rawArticleId: number }) => ca.rawArticleId)
  );

  const sources = await db.select().from(schema.sources).all();
  const sourceMap = new Map(sources.map((s: { id: number }) => [s.id, s]));

  // Build enriched analyses
  const enrichedAnalyses = analyses.map((a: Record<string, unknown>) => {
    const source = sourceMap.get(a.sourceId as number) as Record<string, unknown>;
    const rawArticle = rawArticles.find((ra: { sourceId: number }) => ra.sourceId === a.sourceId);
    return {
      sourceName: source.name,
      politicalLean: source.politicalLean,
      tone: a.tone || "neutral",
      framing: a.framing || "",
      emphasis: a.emphasis || "",
      omissions: a.omissions,
      title: rawArticle?.title || "",
      description: rawArticle?.description || "",
      content: rawArticle?.content,
    };
  });

  // Get previous articles for internal linking
  const previousArticles = await db
    .select({ slug: schema.articles.slug, headline: schema.articles.headline })
    .from(schema.articles)
    .orderBy(desc(schema.articles.id))
    .limit(50)
    .all();

  console.log(
    `  Synthesizing: "${cluster.topicSummary?.slice(0, 60)}..." (${enrichedAnalyses.length} sources, ${previousArticles.length} prev articles)`
  );

  const response = await llm({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: SYNTHESIS_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: synthesisPrompt(
          cluster.topicSummary || "Sin tema",
          enrichedAnalyses,
          cluster.categories
            ? JSON.parse(cluster.categories).join(", ")
            : cluster.category || "sociedad",
          previousArticles,
          isEnrichment
        ),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);

    const sectionsJson = JSON.stringify({
      facts: parsed.facts,
      coverage: parsed.coverage,
      hidden: parsed.hidden,
      context: parsed.context,
      questions: parsed.questions,
    });

    // Parse categories from Claude (array) or fall back to cluster
    const clusterCats: string[] = cluster.categories
      ? JSON.parse(cluster.categories)
      : cluster.category ? [cluster.category] : ["sociedad"];
    const parsedCats: string[] = Array.isArray(parsed.categories)
      ? parsed.categories.map((c: string) => c.trim().toLowerCase()).slice(0, 3)
      : typeof parsed.category === "string"
        ? [parsed.category.trim().toLowerCase()]
        : [];
    const categories = parsedCats.length > 0 ? parsedCats : clusterCats;
    const categoriesJson = JSON.stringify(categories);

    // Check if an article already exists for this cluster (enrichment case)
    const existingByCluster = await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.clusterId, clusterId))
      .get();

    if (existingByCluster) {
      // Re-synthesized with all analyses — UPDATE existing article
      await db.update(schema.articles)
        .set({
          headline: parsed.headline || existingByCluster.headline,
          summary: parsed.summary || existingByCluster.summary,
          sections: sectionsJson,
          sentiment: parsed.sentiment || null,
          category: categories[0],
          categories: categoriesJson,
          sourcesCount: enrichedAnalyses.length,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.articles.id, existingByCluster.id))
        .run();

      console.log(
        `    ↻ Article updated: "${existingByCluster.slug}" (${enrichedAnalyses.length} sources)`
      );
      return existingByCluster.slug;
    }

    const slug = slugify(parsed.headline || cluster.topicSummary || "noticia");

    // Check for duplicate — if same slug already exists, skip (same story already published)
    const existingBySlug = await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug))
      .get();

    if (existingBySlug) {
      console.log(`    ⊘ Skipped duplicate: "${slug}" already exists`);
      return null;
    }

    await db.insert(schema.articles)
      .values({
        clusterId,
        editionId,
        slug,
        headline: parsed.headline || cluster.topicSummary || "Sin titular",
        summary: parsed.summary || null,
        sections: sectionsJson,
        sentiment: parsed.sentiment || null,
        category: categories[0],
        categories: categoriesJson,
        sourcesCount: enrichedAnalyses.length,
      })
      .run();

    console.log(`    ✓ Article created: ${slug}`);
    return slug;
  } catch (e) {
    console.log(`    ✗ Failed to parse synthesis: ${e}`);
    console.log(`    Raw: ${text.slice(0, 200)}`);
    return null;
  }
}

export async function synthesizeEdition(
  editionId: number,
  enrichedClusterIds: number[] = []
): Promise<number> {
  // Get clusters that have analyses (2+ sources)
  const analyzedClusters = await db
    .select({ clusterId: schema.sourceAnalyses.clusterId })
    .from(schema.sourceAnalyses)
    .groupBy(schema.sourceAnalyses.clusterId)
    .all();

  const clusterIds = [...new Set(analyzedClusters.map((c: { clusterId: number }) => c.clusterId))];

  // Filter to only clusters from this edition
  const editionClusters = await db
    .select()
    .from(schema.clusters)
    .where(eq(schema.clusters.editionId, editionId))
    .all();

  const editionClusterIds = new Set(editionClusters.map((c: { id: number }) => c.id));
  const enrichedSet = new Set(enrichedClusterIds);

  // Include both edition clusters and enriched clusters
  const toSynthesize = clusterIds.filter(
    (id) => editionClusterIds.has(id) || enrichedSet.has(id)
  );

  const total = toSynthesize.length;
  console.log(`  Synthesizing ${total} clusters (concurrency=15)...`);

  let done = 0;
  const tasks = toSynthesize.map((clusterId) => async () => {
    const isEnrichment = enrichedSet.has(clusterId);
    const slug = await synthesizeCluster(clusterId, editionId, isEnrichment);
    done++;
    // Progressive export: article appears on web immediately (local dev only)
    if (slug && !isCI) {
      try { await exportArticle(slug); } catch (e) {
        console.log(`    ⚠ Export failed for ${slug}: ${e}`);
      }
    }
    if (slug) {
      console.log(`  [${done}/${total}] ✓ ${slug}`);
    } else {
      console.log(`  [${done}/${total}] skipped`);
    }
    return slug;
  });

  const results = await runConcurrent(tasks, 15);
  const created = results.filter((slug) => slug !== null).length;

  // Update edition
  await db.update(schema.editions)
    .set({
      articleCount: created,
      status: "published",
      publishedAt: new Date().toISOString(),
    })
    .where(eq(schema.editions.id, editionId))
    .run();

  console.log(`Published edition #${editionId} with ${created} articles`);
  return created;
}
